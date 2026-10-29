const Order = require("../models/ordersModel");
const Garment = require("../models/garmentsModel");

// 1. Create New Order (Customer)
exports.createOrder = async (req, res, next) => {
    const { items, deliveryAddress, fabricPickupDetails } = req.body;

    // Process items and attach measurement snapshots if custom size selected
    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
        const garment = await Garment.findById(item.garment);
        if (!garment) {
            return next(new Error(`Garment with ID ${item.garment} not found`));
        }

        let snapshot = undefined;

        if (item.sizingTypeUsed === "custom") {
            // Find measurement profile from logged-in user
            const profile = req.user.measurements.id(item.measurementProfileId);
            if (!profile) {
                return next(
                    new Error(
                        "Selected measurement profile not found in your account",
                    ),
                );
            }
            snapshot = profile.toObject();
        }

        const itemPrice = garment.basePrice;
        totalAmount += itemPrice;

        processedItems.push({
            garment: garment._id,
            sizingTypeUsed: item.sizingTypeUsed,
            selectedStandardSize: item.selectedStandardSize,
            measurementSnapshot: snapshot,
            fabricSource: item.fabricSource,
            fabricDetails: item.fabricDetails,
            customizationNotes: item.customizationNotes,
            referenceImages: item.referenceImages || [],
            itemPrice,
        });
    }

    const checkFabricPickup = processedItems.some(
        (i) => i.fabricSource === "provided_by_customer",
    );

    const newOrder = await Order.create({
        customer: req.user._id,
        items: processedItems,
        fabricPickupRequired: checkFabricPickup,
        fabricPickupDetails: checkFabricPickup
            ? fabricPickupDetails
            : undefined,
        status: checkFabricPickup ? "awaiting_fabric" : "order_placed",
        totalAmount,
        deliveryAddress,
    });

    res.status(201).json({
        status: "success",
        data: {
            order: newOrder,
        },
    });
};

// 2. Get All Orders for Logged-In Customer
exports.getMyOrders = async (req, res, next) => {
    const orders = await Order.find({ customer: req.user._id }).sort(
        "-createdAt",
    );

    res.status(200).json({
        status: "success",
        results: orders.length,
        data: {
            orders,
        },
    });
};

// 3. Get Single Order by ID
exports.getOrder = async (req, res, next) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        return next(new Error("No order found with that ID"));
    }

    // Access Control: Customers can only access their own orders
    if (
        req.user.role === "customer" &&
        order.customer._id.toString() !== req.user._id.toString()
    ) {
        return next(new Error("You do not have permission to view this order"));
    }

    res.status(200).json({
        status: "success",
        data: {
            order,
        },
    });
};

// 4. Get All Orders (Admin & Tailor Dashboard)
exports.getAllOrders = async (req, res, next) => {
    let filter = {};

    // Tailors only see orders assigned to them
    if (req.user.role === "tailor") {
        filter = { assignedTailor: req.user._id };
    }

    const orders = await Order.find(filter).sort("-createdAt");

    res.status(200).json({
        status: "success",
        results: orders.length,
        data: {
            orders,
        },
    });
};

// 5. Update Order Status (Tailor / Admin)
exports.updateOrderStatus = async (req, res, next) => {
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true },
    );

    if (!order) {
        return next(new Error("No order found with that ID"));
    }

    res.status(200).json({
        status: "success",
        data: {
            order,
        },
    });
};

// 6. Assign Tailor to Order (Admin Only)
exports.assignTailor = async (req, res, next) => {
    const { tailorId } = req.body;

    const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
            assignedTailor: tailorId,
            status: "assigned_to_tailor",
        },
        { new: true, runValidators: true },
    );

    if (!order) {
        return next(new Error("No order found with that ID"));
    }

    res.status(200).json({
        status: "success",
        data: {
            order,
        },
    });
};
