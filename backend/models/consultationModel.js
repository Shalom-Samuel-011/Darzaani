const mongoose = require("mongoose");
const validator = require("validator");
const consultationSlots = require("../utils/consultationSlots");

const consultationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please provide your name"],
            trim: true,
            maxlength: 80,
        },
        email: {
            type: String,
            required: [true, "Please provide your email address"],
            trim: true,
            lowercase: true,
            maxlength: 254,
            validate: [validator.isEmail, "Please provide a valid email address"],
        },
        phone: {
            type: String,
            required: [true, "Please provide your phone number"],
            trim: true,
            minlength: 7,
            maxlength: 20,
        },
        preferredDate: {
            type: Date,
            required: [true, "Please choose a preferred date"],
        },
        preferredTime: {
            type: String,
            required: true,
            enum: consultationSlots.map((slot) => slot.value),
        },
        timeSlotKey: {
            type: String,
            enum: consultationSlots.map((slot) => slot.key),
        },
        consultationType: {
            type: String,
            required: true,
            enum: ["atelier", "video"],
        },
        garmentInterest: {
            type: String,
            required: true,
            enum: ["Sarees & blouses", "Kurtis & sets", "Lehengas", "Something else"],
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        status: {
            type: String,
            enum: ["requested", "confirmed", "completed", "cancelled"],
            default: "requested",
            index: true,
        },
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
        },
    },
    { timestamps: true },
);

consultationSchema.index(
    { branch: 1, preferredDate: 1, timeSlotKey: 1 },
    {
        unique: true,
        name: "unique_active_consultation_slot_per_branch",
        partialFilterExpression: {
            status: { $in: ["requested", "confirmed"] },
            timeSlotKey: { $type: "string" },
        },
    },
);

module.exports = mongoose.model("Consultation", consultationSchema);
