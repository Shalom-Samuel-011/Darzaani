const mongoose = require("mongoose");

const garmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "A garment must have a name"],
            trim: true,
        },
        category: {
            type: String,
            required: [true, "A garment must have a category"],
            enum: [
                "Suits",
                "Lehengas",
                "Sherwanis",
                "Dresses",
                "Shirts",
                "Sarees & Blouses",
                "Kurtis & Sets",
                "Fabrics",
            ],
            index: true,
        },
        description: {
            type: String,
            trim: true,
        },
        basePrice: {
            type: Number,
            required: [true, "A product must have a base price"],
        },
        estimatedDays: {
            type: Number,
            default: 7, // Stitching turnaround time
        },
        sizingType: {
            type: String,
            enum: ["custom_only", "standard_only", "both"],
            default: "custom_only",
        },
        availableStandardSizes: {
            type: [String],
            enum: ["XS", "S", "M", "L", "XL", "XXL", "Free Size"],
            default: [],
        },
        availableColors: {
            type: [String],
            default: [],
        },
        images: [String],
        isAvailable: {
            type: Boolean,
            default: true,
        },
        // Additional fabric/style specifications if needed
        attributes: {
            type: Map,
            of: String,
        },
    },
    {
        timestamps: true,
    },
);

const Garment = mongoose.model("Garment", garmentSchema);
module.exports = Garment;
