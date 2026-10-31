const express = require("express");
const authController = require("../controllers/authController");
const reviewController = require("../controllers/reviewController");

const router = express.Router();

// Authenticated customers can submit a brand review.
router.post(
    "/",
    authController.protect,
    authController.restrictTo("customer"),
    reviewController.createReview,
);

// Public: anyone can fetch brand reviews (homepage + admin dashboard).
router.get("/", reviewController.getAllReviews);

module.exports = router;
