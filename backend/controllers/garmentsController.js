const Garment = require("../models/garmentsModel");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apifeatures");
const fs = require("fs/promises");

// 1. Get All Garments (With Filtering, Sorting & Pagination)
exports.getAllGarments = async (req, res, next) => {
    const search = String(req.query.search || "").trim();
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchFilter = search
        ? {
              $or: [
                  { name: { $regex: escapedSearch, $options: "i" } },
                  { description: { $regex: escapedSearch, $options: "i" } },
                  { category: { $regex: escapedSearch, $options: "i" } },
              ],
          }
        : {};

    const fetch_garments = new APIFeatures(
        Garment.find(searchFilter),
        req.query,
    )
        .filter()
        .sort()
        .fieldLimit();

    const totalResults = await Garment.countDocuments(
        fetch_garments.query.getFilter(),
    );
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
        Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
        10,
    );
    const totalPages = Math.ceil(totalResults / limit);

    const garments = await fetch_garments.paginate().query;

    res.status(200).json({
        status: "success",
        results: garments.length,
        totalResults,
        page,
        totalPages,
        data: {
            garments,
        },
    });
};

// 2. Get Single Garment by ID
exports.getGarment = async (req, res, next) => {
    const garment = await Garment.findById(req.params.id);

    if (!garment) {
        return next(new AppError(404, "No garment found with that ID"));
    }

    res.status(200).json({
        status: "success",
        data: {
            garment,
        },
    });
};

// 3. Create New Garment (Admin Only)
exports.createGarment = async (req, res, next) => {
    const uploadedFiles = req.files || [];
    const urlImages = String(req.body.imageUrls || "")
        .split(/\r?\n/)
        .map((url) => url.trim())
        .filter(Boolean);
    const existingImages = Array.isArray(req.body.images) ? req.body.images : [];
    const uploadedImages = uploadedFiles.map(
        (file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
    );

    try {
        const newGarment = await Garment.create({
            ...req.body,
            images: [...existingImages, ...urlImages, ...uploadedImages],
        });

        res.status(201).json({
            status: "success",
            data: {
                garment: newGarment,
            },
        });
    } catch (error) {
        await Promise.all(
            uploadedFiles.map((file) => fs.unlink(file.path).catch(() => {})),
        );
        next(error);
    }
};

// 4. Update Garment (Admin Only)
exports.updateGarment = async (req, res, next) => {
    const garment = await Garment.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!garment) {
        return next(new AppError(404, "No garment found with that ID"));
    }

    res.status(200).json({
        status: "success",
        data: {
            garment,
        },
    });
};

// 5. Delete Garment (Admin Only)
exports.deleteGarment = async (req, res, next) => {
    const garment = await Garment.findByIdAndDelete(req.params.id);

    if (!garment) {
        return next(new AppError(404, "No garment found with that ID"));
    }

    res.status(204).json({
        status: "success",
        data: null,
    });
};
