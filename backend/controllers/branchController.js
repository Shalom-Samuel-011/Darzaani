const Branch = require("../models/branchModel");
const AppError = require("../utils/appError");
const geocodeAddress = require("../utils/geocoding");

// 1. Get all active branches (Public & Master Admin)
exports.getAllBranches = async (req, res, next) => {
    const branches = await Branch.find({ isActive: true }).populate("manager", "name email phone");

    res.status(200).json({
        status: "success",
        results: branches.length,
        data: {
            branches,
        },
    });
};

// 2. Find nearest branch using MongoDB $geoNear geospatial query
exports.getNearestBranch = async (req, res, next) => {
    const { lng, lat } = req.query;

    if (!lng || !lat) {
        return next(new AppError(400, "Please provide longitude (lng) and latitude (lat) query parameters."));
    }

    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);

    if (isNaN(longitude) || isNaN(latitude)) {
        return next(new AppError(400, "Invalid coordinate values provided."));
    }

    // MongoDB $geoNear aggregation pipeline
    const nearestBranches = await Branch.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [longitude, latitude],
                },
                distanceField: "distanceInMeters",
                spherical: true,
                query: { isActive: true },
            },
        },
        { $limit: 3 }, // Return top 3 closest branches
    ]);

    // Format distance in kilometers for clean frontend consumption
    const formatted = nearestBranches.map((branch) => ({
        ...branch,
        distanceKm: (branch.distanceInMeters / 1000).toFixed(2),
    }));

    res.status(200).json({
        status: "success",
        results: formatted.length,
        data: {
            branches: formatted,
        },
    });
};

// 3. Create a new branch (Master Admin only)
exports.createBranch = async (req, res, next) => {
    const { name, code, address, phone, manager } = req.body;

    if (!address?.street || !address?.city || !address?.state || !address?.pincode) {
        return next(new AppError(400, "Please provide the complete branch address."));
    }

    let coordinates;
    try {
        coordinates = await geocodeAddress(address);
    } catch (error) {
        console.error("Branch address geocoding failed:", error.message);
        return next(new AppError(503, "Could not look up this address right now. Please try again."));
    }
    if (!coordinates) {
        return next(new AppError(400, "We could not find this address. Check the street, city, state, and PIN code."));
    }

    const newBranch = await Branch.create({
        name,
        code,
        address,
        phone,
        location: {
            type: "Point",
            coordinates,
        },
        manager,
    });

    res.status(201).json({
        status: "success",
        data: {
            branch: newBranch,
        },
    });
};
