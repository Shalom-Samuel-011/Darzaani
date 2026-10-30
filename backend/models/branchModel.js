const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "A branch must have a name"],
            trim: true,
            unique: true,
        },
        code: {
            type: String,
            required: [true, "A branch must have a unique identifier code"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        address: {
            street: { type: String, required: true },
            city: { type: String, default: "New Delhi" },
            state: { type: String, default: "Delhi" },
            pincode: { type: String, required: true },
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        // GeoJSON Point format for MongoDB 2DSphere geospatial calculations
        // Note: MongoDB requires [longitude, latitude] order
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number], // [lng, lat]
                required: true,
            },
        },
        manager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    },
);

// 2DSphere index enabling $nearSphere and $geoNear queries
branchSchema.index({ location: "2dsphere" });

const Branch = mongoose.model("Branch", branchSchema);

module.exports = Branch;
