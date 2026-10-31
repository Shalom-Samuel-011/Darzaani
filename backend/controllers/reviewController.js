const Review = require("../models/reviewModel");
const AppError = require("../utils/appError");

exports.createReview = async (req, res, next) => {
    const { rating, comment } = req.body || {};

    if (!rating || rating < 1 || rating > 5) {
        return next(new AppError(400, "Please provide a rating between 1 and 5."));
    }
    if (!comment || !comment.trim()) {
        return next(new AppError(400, "Please provide a review comment."));
    }

    const existingReview = await Review.findOne({ customer: req.user._id });
    if (existingReview) {
        return next(new AppError(409, "You have already submitted a review."));
    }

    const review = await Review.create({
        customer: req.user._id,
        rating,
        comment: comment.trim(),
    });

    res.status(201).json({
        status: "success",
        data: { review },
    });
};

exports.getAllReviews = async (req, res) => {
    const reviews = await Review.find().sort("-createdAt");

    res.status(200).json({
        status: "success",
        results: reviews.length,
        data: { reviews },
    });
};
