const mongoose = require("mongoose");
const Branch = require("../models/branchModel");
const Consultation = require("../models/consultationModel");
const Order = require("../models/ordersModel");
const User = require("../models/userModel");
const Garment = require("../models/garmentsModel");
const AppError = require("../utils/appError");
const { canAdvanceOrder } = require("../utils/orderWorkflow");

const pageParams = (query) => {
    const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 10, 1), 100);
    return { page, limit, skip: (page - 1) * limit };
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.requireBranch = async (req, res, next) => {
    if (!req.user.branch) return next(new AppError(403, "Your account is not assigned to a branch."));
    const branch = await Branch.findOne({ _id: req.user.branch, isActive: true }).select("_id name code address phone").lean();
    if (!branch) return next(new AppError(403, "Your assigned branch is unavailable. Contact a master administrator."));
    req.managerBranch = branch;
    next();
};

exports.getDashboard = async (req, res) => {
    const branchId = req.managerBranch._id;
    const [activeOrders, unassignedOrders, readyForReview, requestedConsultations, upcomingConsultations, tailors, recentOrders, recentConsultations] = await Promise.all([
        Order.countDocuments({ branch: branchId, status: { $nin: ["completed", "dispatched", "delivered", "cancelled"] } }),
        Order.countDocuments({ branch: branchId, assignedTailor: { $exists: false }, paymentStatus: "paid", status: "order_placed" }),
        Order.countDocuments({ branch: branchId, paymentStatus: "paid", status: "trial_ready" }),
        Consultation.countDocuments({ branch: branchId, status: "requested" }),
        Consultation.countDocuments({ branch: branchId, status: { $in: ["requested", "confirmed"] }, preferredDate: { $gte: new Date() } }),
        User.countDocuments({ branch: branchId, role: "tailor" }),
        Order.find({ branch: branchId }).select("-items.measurementSnapshot -items.referenceImages -deliveryAddress -payment -checkoutRequestId -sourceCartItemIds").sort("-createdAt").limit(5).lean(),
        Consultation.find({ branch: branchId, status: { $in: ["requested", "confirmed"] }, preferredDate: { $gte: new Date() } }).sort("preferredDate").limit(5).lean(),
    ]);
    res.status(200).json({ status: "success", data: {
        branch: req.managerBranch,
        stats: { activeOrders, unassignedOrders, readyForReview, requestedConsultations, upcomingConsultations, tailors },
        recentOrders,
        recentConsultations,
    } });
};

exports.getOrders = async (req, res) => {
    const { page, limit, skip } = pageParams(req.query);
    const filter = { branch: req.managerBranch._id };
    if (req.query.tailor === "unassigned") {
        filter.assignedTailor = { $exists: false };
        const readyStatuses = ["order_placed"];
        filter.status = { $in: req.query.status ? readyStatuses.filter((status) => status === req.query.status) : readyStatuses };
    }
    else {
        if (req.query.status) filter.status = req.query.status;
        if (req.query.tailor && mongoose.isValidObjectId(req.query.tailor)) filter.assignedTailor = req.query.tailor;
    }
    if (req.query.search && String(req.query.search).trim()) {
        const text = String(req.query.search).trim();
        const safe = escapeRegex(text);
        const customers = await User.find({ $or: [
            { name: { $regex: safe, $options: "i" } },
            { email: { $regex: safe, $options: "i" } },
            { phone: { $regex: safe, $options: "i" } },
        ] }).distinct("_id");
        filter.$or = [{ customer: { $in: customers } }];
        if (mongoose.isValidObjectId(text)) filter.$or.push({ _id: text });
    }
    const [orders, total] = await Promise.all([
        Order.find(filter).select("-items.measurementSnapshot -items.referenceImages -deliveryAddress -payment -checkoutRequestId -sourceCartItemIds")
            .sort("-createdAt").skip(skip).limit(limit).lean(),
        Order.countDocuments(filter),
    ]);
    res.status(200).json({ status: "success", results: total, page, pages: Math.ceil(total / limit), data: { orders } });
};

exports.getConsultations = async (req, res) => {
    const { page, limit, skip } = pageParams(req.query);
    const filter = { branch: req.managerBranch._id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search && String(req.query.search).trim()) {
        const safe = escapeRegex(String(req.query.search).trim());
        filter.$or = ["name", "email", "phone", "garmentInterest"].map((field) => ({ [field]: { $regex: safe, $options: "i" } }));
    }
    const [consultations, total] = await Promise.all([
        Consultation.find(filter).populate("branch", "name code").sort("preferredDate").skip(skip).limit(limit).lean(),
        Consultation.countDocuments(filter),
    ]);
    res.status(200).json({ status: "success", results: total, page, pages: Math.ceil(total / limit), data: { consultations } });
};

exports.getTailors = async (req, res) => {
    const tailors = await User.find({ branch: req.managerBranch._id, role: "tailor" })
        .select("name email phone createdAt").sort("name").lean();
    const workload = await Order.aggregate([
        { $match: { branch: req.managerBranch._id, assignedTailor: { $ne: null }, status: { $nin: ["completed", "dispatched", "delivered", "cancelled"] } } },
        { $group: { _id: "$assignedTailor", activeOrders: { $sum: 1 } } },
    ]);
    const workloadById = new Map(workload.map((entry) => [entry._id.toString(), entry.activeOrders]));
    res.status(200).json({ status: "success", results: tailors.length, data: {
        tailors: tailors.map((tailor) => ({ ...tailor, activeOrders: workloadById.get(tailor._id.toString()) || 0 })),
    } });
};

exports.getInventory = async (req, res) => {
    const { page, limit, skip } = pageParams(req.query);
    const filter = {};
    const requestedIds = typeof req.query.ids === "string"
        ? [...new Set(req.query.ids.split(",").filter((id) => mongoose.isValidObjectId(id)))].slice(0, 10)
        : [];
    if (requestedIds.length) filter._id = { $in: requestedIds };
    if (req.query.search && String(req.query.search).trim()) {
        const safe = escapeRegex(String(req.query.search).trim());
        filter.$or = ["name", "category", "description"].map((field) => ({ [field]: { $regex: safe, $options: "i" } }));
    }
    const [garments, total] = await Promise.all([
        Garment.find(filter).select("name category basePrice images isAvailable branchAvailability")
            .sort("category name").skip(skip).limit(requestedIds.length ? requestedIds.length : limit).lean(),
        Garment.countDocuments(filter),
    ]);
    const inventory = garments.map((garment) => {
        const branchOverride = (garment.branchAvailability || []).find((entry) => entry.branch.toString() === req.managerBranch._id.toString());
        return {
            _id: garment._id,
            name: garment.name,
            category: garment.category,
            basePrice: garment.basePrice,
            images: garment.images,
            globallyAvailable: garment.isAvailable,
            isAvailable: garment.isAvailable && (branchOverride ? branchOverride.isAvailable : true),
            hasBranchOverride: Boolean(branchOverride),
        };
    });
    res.status(200).json({ status: "success", results: total, page, pages: Math.ceil(total / limit), data: { inventory } });
};

exports.updateInventoryAvailability = async (req, res, next) => {
    if (typeof req.body.isAvailable !== "boolean") return next(new AppError(400, "Choose whether this piece is available at your branch."));
    const garment = await Garment.findById(req.params.garmentId);
    if (!garment) return next(new AppError(404, "No catalog piece found with that ID."));
    if (req.body.isAvailable && !garment.isAvailable) {
        return next(new AppError(409, "This piece is disabled in the catalog by a master administrator."));
    }
    garment.branchAvailability ||= [];
    let branchOverride = garment.branchAvailability.find((entry) => entry.branch.toString() === req.managerBranch._id.toString());
    if (!branchOverride) {
        garment.branchAvailability.push({ branch: req.managerBranch._id, isAvailable: req.body.isAvailable, updatedBy: req.user._id, updatedAt: new Date() });
    } else {
        branchOverride.isAvailable = req.body.isAvailable;
        branchOverride.updatedBy = req.user._id;
        branchOverride.updatedAt = new Date();
    }
    await garment.save();
    res.status(200).json({ status: "success", data: { inventoryItem: {
        _id: garment._id,
        name: garment.name,
        category: garment.category,
        basePrice: garment.basePrice,
        globallyAvailable: garment.isAvailable,
        isAvailable: garment.isAvailable && req.body.isAvailable,
        hasBranchOverride: true,
    } } });
};

exports.getOrderDetails = async (req, res, next) => {
    const order = await Order.findOne({ _id: req.params.orderId, branch: req.managerBranch._id })
        .select("-items.measurementSnapshot -items.referenceImages -deliveryAddress -payment -checkoutRequestId -sourceCartItemIds")
        .populate("workflowHistory.actor", "name role");
    if (!order) return next(new AppError(404, "No order found in your branch with that ID."));
    res.status(200).json({ status: "success", data: { order } });
};

exports.getConsultationDetails = async (req, res, next) => {
    const consultation = await Consultation.findOne({ _id: req.params.consultationId, branch: req.managerBranch._id })
        .populate("branch", "name code address phone");
    if (!consultation) return next(new AppError(404, "No consultation found in your branch with that ID."));
    res.status(200).json({ status: "success", data: { consultation } });
};

exports.updateConsultationStatus = async (req, res, next) => {
    const consultation = await Consultation.findOneAndUpdate(
        { _id: req.params.consultationId, branch: req.managerBranch._id },
        { status: req.body.status },
        { new: true, runValidators: true },
    ).populate("branch", "name code");
    if (!consultation) return next(new AppError(404, "No consultation found in your branch with that ID."));
    res.status(200).json({ status: "success", data: { consultation } });
};

exports.updateOrderStatus = async (req, res, next) => {
    const existing = await Order.findOne({ _id: req.params.orderId, branch: req.managerBranch._id });
    if (!existing) return next(new AppError(404, "No order found in your branch with that ID."));
    if (existing.paymentStatus !== "paid") return next(new AppError(409, "An order cannot enter production before payment is confirmed."));
    if (!canAdvanceOrder(existing.status, req.body.status)) {
        return next(new AppError(409, `Order cannot move from ${existing.status} to ${req.body.status}.`));
    }
    const previousStatus = existing.status;
    existing.status = req.body.status;
    existing.workflowHistory.push({ type: "status_changed", fromStatus: previousStatus, toStatus: req.body.status, actor: req.user._id });
    await existing.save();
    const order = await Order.findById(existing._id)
        .select("-items.measurementSnapshot -items.referenceImages -deliveryAddress -payment -checkoutRequestId -sourceCartItemIds")
        .populate("workflowHistory.actor", "name role");
    res.status(200).json({ status: "success", data: { order } });
};

exports.assignTailor = async (req, res, next) => {
    const { tailorId } = req.body;
    if (!mongoose.isValidObjectId(tailorId)) return next(new AppError(400, "Choose a valid tailor."));
    const [order, tailor] = await Promise.all([
        Order.findOne({ _id: req.params.orderId, branch: req.managerBranch._id }),
        User.findOne({ _id: tailorId, branch: req.managerBranch._id, role: "tailor" }).select("_id name"),
    ]);
    if (!order) return next(new AppError(404, "No order found in your branch with that ID."));
    if (!tailor) return next(new AppError(400, "The tailor must belong to your branch."));
    if (order.paymentStatus !== "paid") return next(new AppError(409, "A tailor can only be assigned after payment is confirmed."));
    if (order.status !== "order_placed") {
        return next(new AppError(409, "This order is not ready for tailor assignment."));
    }
    const previousStatus = order.status;
    order.assignedTailor = tailor._id;
    order.status = "assigned_to_tailor";
    order.workflowHistory.push({ type: "tailor_assigned", fromStatus: previousStatus, toStatus: order.status, actor: req.user._id, note: `Assigned to ${tailor.name || "tailor"}.` });
    await order.save();
    const safeOrder = await Order.findById(order._id)
        .select("-items.measurementSnapshot -items.referenceImages -deliveryAddress -payment -checkoutRequestId -sourceCartItemIds")
        .populate("workflowHistory.actor", "name role");
    res.status(200).json({ status: "success", data: { order: safeOrder } });
};
