const User = require("../models/userModel");
const Garment = require("../models/garmentsModel");
const AppError = require("../utils/appError");
// Import your catchAsync wrapper if you use one (e.g., require("../utils/catchAsync"))

exports.fetchMe = async function (req, res, next) {
    res.status(200).json({
        status: "success",
        data: {
            user: req.user,
        },
    });
};

exports.updateMe = async function (req, res, next) {
    // 1. Prevent password updates on this route
    if (req.body.password || req.body.passwordConfirm) {
        return next(
            new AppError(
                400,
                "This route is not for password updates. Please use /resetPassword.",
            ),
        );
    }

    // 2. Filter allowed fields
    const { name, email, phone } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { name, email, phone },
        { new: true, runValidators: true },
    );

    res.status(200).json({
        status: "success",
        data: {
            user: updatedUser,
        },
    });
};

exports.deleteMe = async function (req, res, next) {
    await User.findByIdAndUpdate(req.user._id, { active: false });

    res.status(204).json({
        status: "success",
        data: null,
    });
};

// -----------------------------------------------------------------------------
// EMBEDDED MEASUREMENT CONTROLLERS
// -----------------------------------------------------------------------------

// 1. Add a new measurement profile
exports.addMeasurement = async (req, res, next) => {
    // req.user is already a Mongoose document instance from authController.protect
    req.user.measurements.push(req.body);
    await req.user.save();

    res.status(201).json({
        status: "success",
        data: {
            measurements: req.user.measurements,
        },
    });
};

// 2. Update a specific measurement profile by subdocument _id
exports.updateMeasurement = async (req, res, next) => {
    const measurement = req.user.measurements.id(req.params.measurementId);

    if (!measurement) {
        return next(
            new AppError(404, "No measurement profile found with that ID"),
        );
    }

    Object.assign(measurement, req.body);
    await req.user.save();

    res.status(200).json({
        status: "success",
        data: {
            measurements: req.user.measurements,
        },
    });
};

// 3. Delete a measurement profile by subdocument _id
exports.deleteMeasurement = async (req, res, next) => {
    const measurement = req.user.measurements.id(req.params.measurementId);

    if (!measurement) {
        return next(
            new AppError(404, "No measurement profile found with that ID"),
        );
    }

    req.user.measurements.pull(req.params.measurementId);
    await req.user.save();

    res.status(204).json({
        status: "success",
        data: null,
    });
};

const serializeCart = async (user) => {
    await user.populate("cartItems.garment");
    return user.cartItems
        .filter((item) => item.garment)
        .map((item) => {
            const measurement = item.selectedMeasurementProfileId
                ? user.measurements.id(item.selectedMeasurementProfileId)
                : null;
            return {
                id: item._id.toString(),
                garment: item.garment,
                sizingTypeUsed: item.sizingTypeUsed,
                selectedStandardSize: item.selectedStandardSize,
                selectedMeasurementProfileId: item.selectedMeasurementProfileId,
                selectedMeasurementProfileTitle: measurement?.profileTitle,
                selectedColor: item.selectedColor,
                quantity: item.quantity,
            };
        });
};

exports.getMyCart = async (req, res) => {
    res.status(200).json({
        status: "success",
        data: { items: await serializeCart(req.user) },
    });
};

exports.addCartItem = async (req, res, next) => {
    const {
        garment: garmentId,
        sizingTypeUsed,
        selectedStandardSize,
        selectedMeasurementProfileId,
        selectedColor,
    } = req.body;
    const garment = await Garment.findById(garmentId);

    if (!garment || !garment.isAvailable) {
        return next(new AppError(404, "This piece is no longer available."));
    }
    if (!selectedColor || (garment.availableColors.length && !garment.availableColors.includes(selectedColor))) {
        return next(new AppError(400, "Choose an available colour for this piece."));
    }
    if (sizingTypeUsed === "standard") {
        if (garment.sizingType === "custom_only" || !selectedStandardSize) {
            return next(new AppError(400, "Choose a valid standard size."));
        }
        if (garment.availableStandardSizes.length && !garment.availableStandardSizes.includes(selectedStandardSize)) {
            return next(new AppError(400, "That size is not available for this piece."));
        }
    } else if (sizingTypeUsed === "custom") {
        if (garment.sizingType === "standard_only" || !req.user.measurements.id(selectedMeasurementProfileId)) {
            return next(new AppError(400, "Choose a saved measurement profile for custom fit."));
        }
    } else {
        return next(new AppError(400, "Choose a valid fit option."));
    }

    const existing = req.user.cartItems.find((item) =>
        item.garment.equals(garment._id) &&
        item.sizingTypeUsed === sizingTypeUsed &&
        item.selectedStandardSize === selectedStandardSize &&
        item.selectedMeasurementProfileId === selectedMeasurementProfileId &&
        item.selectedColor === selectedColor,
    );

    if (existing) {
        if (existing.quantity >= 99) {
            return next(new AppError(400, "The maximum quantity for this piece is 99."));
        }
        existing.quantity += 1;
    } else {
        req.user.cartItems.push({
            garment: garment._id,
            sizingTypeUsed,
            selectedStandardSize: sizingTypeUsed === "standard" ? selectedStandardSize : undefined,
            selectedMeasurementProfileId: sizingTypeUsed === "custom" ? selectedMeasurementProfileId : undefined,
            selectedColor,
            quantity: 1,
        });
    }

    await req.user.save();
    res.status(200).json({ status: "success", data: { items: await serializeCart(req.user) } });
};

exports.updateCartItem = async (req, res, next) => {
    const item = req.user.cartItems.id(req.params.itemId);
    const quantity = Number(req.body.quantity);
    if (!item) return next(new AppError(404, "Fitting bag item not found."));
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return next(new AppError(400, "Quantity must be between 1 and 99."));
    }
    item.quantity = quantity;
    await req.user.save();
    res.status(200).json({ status: "success", data: { items: await serializeCart(req.user) } });
};

exports.deleteCartItem = async (req, res, next) => {
    const item = req.user.cartItems.id(req.params.itemId);
    if (!item) return next(new AppError(404, "Fitting bag item not found."));
    req.user.cartItems.pull(req.params.itemId);
    await req.user.save();
    res.status(200).json({ status: "success", data: { items: await serializeCart(req.user) } });
};

exports.clearMyCart = async (req, res) => {
    req.user.cartItems = [];
    await req.user.save();
    res.status(200).json({ status: "success", data: { items: [] } });
};
