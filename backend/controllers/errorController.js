const AppError = require("../utils/appError");

const handleJWTError = function () {
    return new AppError(401, "You need to login again");
};

const handleJWTExpiredError = function () {
    return new AppError(401, "Session expired! Login again");
};

const handleCastError = function (err) {
    err.isOperational = true;
    const message = `${err.value} is not a valid mongoose id`;
    return new AppError(400, message);
};

const handleDuplicateKeyError = function (err) {
    err.isOperational = true;
    const messageArr = Object.keys(err.keyValue).map(
        (key) => `A tour with ${key}: ${err.keyValue[`${key}`]} already exists`,
    );

    const message = messageArr.join(",");

    return new AppError(400, message);
};

const handleValidationError = function (err) {
    err.isOperational = true;
    const message = Object.keys(err.errors)
        .map((el) => err.errors[`${el}`].message)
        .join(",");

    return new AppError(400, message);
};

const devErrResponse = function (res, err) {
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        error: err,
        stack: err.stack,
    });
};

const handleErrorResponse = function (res, err) {
    if (process.env.NODE_ENV === "development") {
        return devErrResponse(res, err);
    }

    const message = err.isOperational
        ? err.message
        : "Oops! something went wrong";

    res.status(err.statusCode).json({
        status: err.status,
        message,
    });
};

module.exports = function (err, req, res, next) {
    // 1) Providing default values if they don't exist
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    console.log(err);

    if (err.name === "CastError") {
        err = handleCastError(err);
    }
    if (err.code === 11000) {
        err = handleDuplicateKeyError(err);
    }
    if (err.name === "ValidationError") {
        err = handleValidationError(err);
    }
    if (err.name === "JsonWebTokenError") {
        err = handleJWTError();
    }
    if (err.name === "TokenExpiredError") {
        err = handleJWTExpiredError();
    }

    // 2) Now err.statusCode is guaranteed to be a number (at least 500)
    handleErrorResponse(res, err);
};
