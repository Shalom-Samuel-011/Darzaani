const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const AppError = require("../utils/appError");

const uploadDirectory = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const imageTypes = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
};

const upload = multer({
    storage: multer.diskStorage({
        destination: uploadDirectory,
        filename: (_req, file, callback) => {
            callback(null, `${crypto.randomUUID()}${imageTypes[file.mimetype]}`);
        },
    }),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5,
    },
    fileFilter: (_req, file, callback) => {
        if (!imageTypes[file.mimetype]) {
            return callback(new AppError(400, "Upload a JPG, PNG, or WebP image."));
        }
        callback(null, true);
    },
});

exports.uploadGarmentImages = (req, res, next) => {
    upload.array("images", 5)(req, res, (error) => {
        if (!error) return next();

        if (error instanceof multer.MulterError) {
            if (error.code === "LIMIT_FILE_SIZE") {
                return next(new AppError(413, "Each image must be 5 MB or smaller."));
            }
            if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
                return next(new AppError(400, "Upload no more than 5 images."));
            }
        }

        next(error);
    });
};
