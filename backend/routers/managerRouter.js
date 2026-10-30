const express = require("express");
const authController = require("../controllers/authController");
const managerController = require("../controllers/managerController");

const router = express.Router();
router.use(authController.protect);
router.use(authController.restrictTo("branch-manager"));
router.use(managerController.requireBranch);

router.get("/dashboard", managerController.getDashboard);
router.get("/orders", managerController.getOrders);
router.get("/orders/:orderId", managerController.getOrderDetails);
router.patch("/orders/:orderId/status", managerController.updateOrderStatus);
router.patch("/orders/:orderId/assign-tailor", managerController.assignTailor);
router.get("/consultations", managerController.getConsultations);
router.get("/consultations/:consultationId", managerController.getConsultationDetails);
router.patch("/consultations/:consultationId/status", managerController.updateConsultationStatus);
router.get("/tailors", managerController.getTailors);
router.get("/inventory", managerController.getInventory);
router.patch("/inventory/:garmentId/availability", managerController.updateInventoryAvailability);

module.exports = router;
