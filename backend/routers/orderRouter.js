const express = require("express");
const orderController = require("../controllers/ordersController");
const authController = require("../controllers/authController");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Require authentication for all order routes
router.use(authController.protect);

const checkoutLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
});

// Customer Routes
router.get("/my-orders", orderController.getMyOrders);

// Checkout amounts and items are assembled from the authenticated user's cart.
router.post("/checkout", checkoutLimiter, orderController.createCheckout);
router.post("/:id/verify-payment", checkoutLimiter, orderController.verifyPayment);

router
    .route("/")
    .get(
        authController.restrictTo("admin", "tailor"),
        orderController.getAllOrders,
    );

router.route("/:id").get(orderController.getOrder);

// Tailor & Admin Operations
router.patch(
    "/:id/status",
    authController.restrictTo("admin", "tailor"),
    orderController.updateOrderStatus,
);

// Admin Only Operations
router.patch(
    "/:id/assign-tailor",
    authController.restrictTo("admin"),
    orderController.assignTailor,
);

module.exports = router;
