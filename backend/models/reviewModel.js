const mongoose = require("mongoose");
const validator = require("validator");

const reviewSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "A review must belong to a customer"],
        },
        rating: {
            type: Number,
            required: [true, "Please provide a rating between 1 and 5"],
            min: [1, "Rating must be at least 1"],
            max: [5, "Rating cannot be more than 5"],
        },
        comment: {
            type: String,
            required: [true, "Please provide a review comment"],
            trim: true,
            maxlength: [1000, "A review comment must have less or equal than 1000 characters"],
        },
    },
    { timestamps: true },
);

// One review per customer
reviewSchema.index({ customer: 1 }, { unique: true });

reviewSchema.pre(/^find/, function () {
    this.populate({
        path: "customer",
        select: "name email role",
    });
});

module.exports = mongoose.model("Review", reviewSchema);
