const express = require("express");
const garmentController = require("../controllers/garmentsController");
const authController = require("../controllers/authController");

const router = express.Router();

// Public / Customer browsing
router.get("/", garmentController.getAllGarments);
router.get("/:id", garmentController.getGarment);

// Restricted to Authenticated Admins
router.use(authController.protect);
router.use(authController.restrictTo("admin"));

router.post("/", garmentController.createGarment);
router
    .route("/:id")
    .patch(garmentController.updateGarment)
    .delete(garmentController.deleteGarment);

module.exports = router;
