const express = require("express");
const orderController = require("../controllers/ordersController");
const authController = require("../controllers/authController");

const router = express.Router();

// Require authentication for all order routes
router.use(authController.protect);

// Customer Routes
router.get("/my-orders", orderController.getMyOrders);

router
    .route("/")
    .post(orderController.createOrder)
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
