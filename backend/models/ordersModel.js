const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
    garment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Garment",
        required: [true, "An order item must refer to a garment"],
    },
    sizingTypeUsed: {
        type: String,
        enum: ["custom", "standard"],
        required: [true, "Please specify sizing type (custom or standard)"],
    },
    selectedStandardSize: {
        type: String,
        enum: ["XS", "S", "M", "L", "XL", "XXL", "Free Size"],
    },
    selectedColor: { type: String, trim: true },
    // Immutable snapshot copy of measurements at time of order
    measurementSnapshot: {
        profileTitle: String,
        unit: { type: String, enum: ["inches", "cm"] },
        shoulders: Number,
        chest: Number,
        bust: Number,
        underBust: Number,
        waistUpper: Number,
        waistLower: Number,
        hip: Number,
        armhole: Number,
        bicep: Number,
        sleeveLength: Number,
        sleeveOpening: Number,
        frontNeckDepth: Number,
        backNeckDepth: Number,
        blouseLength: Number,
        kurtiLength: Number,
        thigh: Number,
        knee: Number,
        calf: Number,
        ankleOpening: Number,
        crotchDepth: Number,
        pantLength: Number,
        lehengaLength: Number,
        fullLength: Number,
        crossBack: Number,
        notes: String,
    },
    fabricDetails: {
        type: String,
        trim: true,
    },
    customizationNotes: {
        type: String,
        trim: true,
    },
    referenceImages: [String],
    itemPrice: {
        type: Number,
        required: [true, "An item must have a price"],
    },
    quantity: {
        type: Number,
        min: 1,
        max: 99,
        default: 1,
    },
});

const orderSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "An order must belong to a customer"],
        },
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            index: true,
        },
        assignedTailor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        items: {
            type: [orderItemSchema],
            validate: [
                (val) => val.length > 0,
                "An order must contain at least one item",
            ],
        },

        // Stitching Status Pipeline
        status: {
            type: String,
            enum: [
                "payment_pending",
                "order_placed",
                "assigned_to_tailor",
                "cutting",
                "stitching",
                "trial_ready",
                "completed",
                "dispatched",
                "delivered",
                "cancelled",
            ],
            default: "order_placed",
            index: true,
        },

        // Financials
        totalAmount: {
            type: Number,
            required: [true, "An order must have a total amount"],
        },
        advancePaid: {
            type: Number,
            default: 0,
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "authorized", "partially_paid", "paid", "failed", "refunded"],
            default: "pending",
        },
        payment: {
            provider: { type: String, enum: ["razorpay"], default: "razorpay" },
            currency: { type: String, enum: ["INR"], default: "INR" },
            amount: { type: Number, min: 1 }, // Smallest currency unit (paise)
            razorpayOrderId: String,
            razorpayOrderCreationStartedAt: Date,
            razorpayPaymentId: String,
            verifiedAt: Date,
        },
        checkoutRequestId: String,
        sourceCartItemIds: [mongoose.Schema.Types.ObjectId],

        deliveryAddress: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
            phone: { type: String, required: true },
        },
        estimatedCompletionDate: Date,
        workflowHistory: [{
            type: { type: String, enum: ["payment_confirmed", "tailor_assigned", "status_changed"], required: true },
            fromStatus: String,
            toStatus: String,
            actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            note: { type: String, trim: true, maxlength: 500 },
            createdAt: { type: Date, default: Date.now },
        }],
    },
    {
        timestamps: true,
    },
);

orderSchema.index(
    { "payment.razorpayOrderId": 1 },
    { unique: true, sparse: true },
);
orderSchema.index({ checkoutRequestId: 1 }, { unique: true, sparse: true });

// Auto-populate customer basic contact details and garment references on queries
orderSchema.pre(/^find/, function () {
    this.populate({
        path: "customer",
        select: "name email phone",
    })
        .populate({
            path: "items.garment",
            select: "name category basePrice images estimatedDays",
        })
        .populate({
            path: "assignedTailor",
            select: "name email phone",
        });
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
