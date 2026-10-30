const express = require("express");
const { rateLimit } = require("express-rate-limit");
const authController = require("../controllers/authController");
const consultationController = require("../controllers/consultationController");

const router = express.Router();
const consultationRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: "fail",
        message: "Too many consultation requests. Please try again later.",
    },
});

// Anyone may request a consultation; account creation is not required.
router.get("/availability", consultationController.getConsultationAvailability);
router.post("/", consultationRequestLimiter, consultationController.createConsultation);

// Atelier staff manage submitted requests from authenticated admin accounts.
router.get(
    "/",
    authController.protect,
    authController.restrictTo("admin"),
    consultationController.getAllConsultations,
);
router.patch(
    "/:id/status",
    authController.protect,
    authController.restrictTo("admin"),
    consultationController.updateConsultationStatus,
);

module.exports = router;
