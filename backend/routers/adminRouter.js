const express = require("express");
const adminController = require("../controllers/adminController");
const authController = require("../controllers/authController");

const router = express.Router();

// All routes require authentication AND master-admin role
router.use(authController.protect);
router.use(authController.restrictTo("master-admin"));

// Dashboard
router.get("/stats", adminController.getDashboardStats);
router.get("/activity", adminController.getRecentActivity);
router.get("/consultations", adminController.getAllConsultations);
router.get("/orders", adminController.getAllOrders);
router.get("/consultations/:consultationId", adminController.getConsultationDetails);
router.get("/orders/:orderId", adminController.getOrderDetails);

// User Management
router.get("/users", adminController.getAllUsers);
router.patch("/users/:userId/role", adminController.updateUserRole);

module.exports = router;
