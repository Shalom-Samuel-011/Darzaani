const express = require("express");
const branchController = require("../controllers/branchController");
const authController = require("../controllers/authController");

const router = express.Router();

// Public routes
router.get("/", branchController.getAllBranches);
router.get("/nearest", branchController.getNearestBranch);

// Protected routes (Master Admin only)
router.use(authController.protect);
router.use(authController.restrictTo("master-admin"));

router.post("/", branchController.createBranch);

module.exports = router;
