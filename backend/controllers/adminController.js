const Branch = require("../models/branchModel");
const Consultation = require("../models/consultationModel");
const Order = require("../models/ordersModel");
const Review = require("../models/reviewModel");
const User = require("../models/userModel");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

// Helper to get start of current month
const getStartOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

// 1. Get Dashboard Statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const startOfMonth = getStartOfMonth();

    // Parallel queries for performance
    const [branchesCount, pendingConsultations, activeOrders, revenueData, totalReviews] = await Promise.all([
      // Total active branches
      Branch.countDocuments({ isActive: true }),
      // Pending consultations (requested status)
      Consultation.countDocuments({ status: "requested" }),
      // Active orders (not completed, cancelled, or delivered)
      Order.countDocuments({
        status: { $nin: ["completed", "cancelled", "delivered"] },
      }),
      // Revenue this month (sum of paid orders)
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: startOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            orderCount: { $sum: 1 },
          },
        },
      ]),
      // Total brand reviews
      Review.countDocuments(),
    ]);

    // Get previous month for comparison (simple approach)
    const prevMonthStart = new Date(getStartOfMonth());
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);

    const prevMonthRevenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: prevMonthStart, $lt: getStartOfMonth() },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const currentRevenue = revenueData[0]?.totalRevenue || 0;
    const previousRevenue = prevMonthRevenue[0]?.totalRevenue || 0;
    const revenueChange = previousRevenue > 0
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : 0;

    res.status(200).json({
      status: "success",
      data: {
        stats: {
          totalBranches: branchesCount,
          pendingConsultations,
          activeOrders,
          revenueThisMonth: currentRevenue,
          revenueChange,
          totalReviews,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Could not fetch dashboard statistics",
    });
  }
};

// 2. Get Recent Activity Feed
exports.getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const { page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * limit;

    // Fetch recent consultations
    const recentConsultations = await Consultation.find()
      .sort("-createdAt")
      .limit(limit)
      .populate("branch", "name code")
      .lean();

    // Fetch recent orders
    const recentOrders = await Order.find()
      .sort("-createdAt")
      .limit(limit)
      .populate("customer", "name email")
      .populate("assignedTailor", "name")
      .lean();

    // Transform consultations into activity format
    const consultationActivities = recentConsultations.map((c) => ({
      id: c._id.toString(),
      type: "consultation",
      message: `New consultation request: ${c.garmentInterest}`,
      branch: c.branch?.name || "Unassigned",
      status: c.status,
      createdAt: c.createdAt,
    }));

    // Transform orders into activity format
    const orderActivities = recentOrders.map((o) => {
      let message = `Order #${o._id.toString().slice(-4)} placed`;
      if (o.assignedTailor) {
        message += ` - assigned to tailor`;
      }
      return {
        id: o._id.toString(),
        type: "order",
        message,
        branch: o.branchId || "General",
        status: o.status,
        customer: o.customer?.name,
        amount: o.totalAmount,
        createdAt: o.createdAt,
      };
    });

    // Merge and sort by date (most recent first)
    const allActivities = [...consultationActivities, ...orderActivities]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    res.status(200).json({
      status: "success",
      results: allActivities.length,
      data: {
        activities: allActivities,
      },
    });
  } catch (error) {
    console.error("Activity fetch error:", error);
    res.status(500).json({
      status: "error",
      message: "Could not fetch recent activity",
    });
  }
};

exports.getConsultationDetails = async (req, res, next) => {
  const consultation = await Consultation.findById(req.params.consultationId)
    .populate("branch", "name code address phone");

  if (!consultation) {
    return next(new AppError(404, "No consultation request found with that ID"));
  }

  res.status(200).json({
    status: "success",
    data: { consultation },
  });
};

exports.getAllConsultations = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.branch) filter.branch = req.query.branch;
    if (req.query.search && String(req.query.search).trim()) {
      const search = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = ["name", "email", "phone", "garmentInterest"].map((field) => ({ [field]: { $regex: search, $options: "i" } }));
    }
    const [consultations, total] = await Promise.all([
      Consultation.find(filter).sort("-createdAt").skip((page - 1) * limit).limit(limit).populate("branch", "name code").lean(),
      Consultation.countDocuments(filter),
    ]);
    res.status(200).json({ status: "success", results: total, page, pages: Math.ceil(total / limit), data: { consultations } });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Could not fetch consultations" });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    if (req.query.tailor) filter.assignedTailor = req.query.tailor;
    if (req.query.branch) filter.branch = req.query.branch;
    if (req.query.search && String(req.query.search).trim()) {
      const rawSearch = String(req.query.search).trim();
      const escapedSearch = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const customerIds = await User.find({ $or: [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { phone: { $regex: escapedSearch, $options: "i" } },
      ] }).distinct("_id");
      const or = [{ customer: { $in: customerIds } }];
      if (mongoose.isValidObjectId(rawSearch)) or.push({ _id: rawSearch });
      filter.$or = or;
    }
    const [orders, total] = await Promise.all([
      Order.find(filter).select("-items.measurementSnapshot -items.referenceImages -deliveryAddress -payment -checkoutRequestId -sourceCartItemIds")
        .populate("branch", "name code")
        .sort("-createdAt").skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);
    res.status(200).json({ status: "success", results: total, page, pages: Math.ceil(total / limit), data: { orders } });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Could not fetch orders" });
  }
};

exports.getOrderDetails = async (req, res, next) => {
  const order = await Order.findById(req.params.orderId).select(
    "-items.measurementSnapshot -items.referenceImages -deliveryAddress -payment -checkoutRequestId -sourceCartItemIds",
  ).populate("workflowHistory.actor", "name role");

  if (!order) {
    return next(new AppError(404, "No order found with that ID"));
  }

  res.status(200).json({
    status: "success",
    data: { order },
  });
};

// 3. Get All Users (for user management)
exports.getAllUsers = async (req, res) => {
  try {
    const { role, branch, search } = req.query;
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (role) filter.role = role;
    if (branch) filter.branch = branch;
    if (search && String(search).trim()) {
      const escapedSearch = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { phone: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort("-createdAt")
        .skip(skip)
        .limit(limit)
        .populate("branch", "name code")
        .lean(),
      User.countDocuments(filter),
    ]);

    // Remove sensitive fields
    const sanitizedUsers = users.map((u) => ({
      ...u,
      password: undefined,
      resetToken: undefined,
      resetTokenValidity: undefined,
    }));

    res.status(200).json({
      status: "success",
      results: total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        users: sanitizedUsers,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Could not fetch users",
    });
  }
};

// 4. Update User Role (Master Admin only)
exports.updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role, branch } = req.body;

    // Prevent changing master-admin role
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    if (user.role === "master-admin" && role !== "master-admin") {
      return res.status(403).json({
        status: "error",
        message: "Cannot change master-admin role",
      });
    }

    const updateData = { role };
    if (role === "branch-manager" || role === "tailor") {
      if (branch) updateData.branch = branch;
    } else {
      updateData.branch = undefined;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).populate("branch", "name code");

    res.status(200).json({
      status: "success",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Could not update user role",
    });
  }
};
