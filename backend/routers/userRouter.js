const express = require("express");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");

const router = express.Router();

// Public auth routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/google", authController.googleAuth);
router.post("/forgotPassword", authController.handleForgotPassword);
router.patch("/resetPassword/:resetToken", authController.handleResetPassword);

// userRouter.js

// All routes below require JWT auth
router.use(authController.protect);

router.get("/me", userController.fetchMe);
router.patch("/updateMe", userController.updateMe);
router.delete("/deleteMe", userController.deleteMe);

// Account-backed fitting bag
router.use("/me/cart", authController.restrictTo("customer"));
router.get("/me/cart", userController.getMyCart);
router.delete("/me/cart", userController.clearMyCart);
router.post("/me/cart/items", userController.addCartItem);
router
    .route("/me/cart/items/:itemId")
    .patch(userController.updateCartItem)
    .delete(userController.deleteCartItem);

// Embedded Measurement Subdocument Routes
router.post("/me/measurements", userController.addMeasurement);
router
    .route("/me/measurements/:measurementId")
    .patch(userController.updateMeasurement)
    .delete(userController.deleteMeasurement);

module.exports = router;
