const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/userModel");
const AppError = require("../utils/appError");
const sendEmail = require("../utils/email");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper function to sign JWT
const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

// Helper function to create and send token response
const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    // Hide password from JSON response
    user.password = undefined;

    res.status(statusCode).json({
        status: "success",
        token,
        data: {
            user,
        },
    });
};

// 1. Standard Email/Password Signup
exports.signup = async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email && req.body.email.trim().toLowerCase(),
        phone: req.body.phone,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        measurements: req.body.measurements || [],
    });

    createSendToken(newUser, 201, res);
};

// 2. Standard Email/Password Login
exports.login = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new AppError(400, "Please provide email and password!"));
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");

    if (!user) return next(new AppError(401, "Incorrect email or password"));

    const isCorrectPassword = await user.correctPassword(password);

    if (!isCorrectPassword) {
        return next(new AppError(401, "Incorrect email or password"));
    }

    createSendToken(user, 200, res);
};

// 3. Google OAuth Login / Signup Handler
exports.googleAuth = async (req, res, next) => {
    const { idToken } = req.body;
    if (!process.env.GOOGLE_CLIENT_ID) {
        return next(new AppError(503, "Google sign-in is not configured"));
    }
    if (!idToken) {
        return next(new AppError(400, "Google ID Token is required"));
    }

    let ticket;
    try {
        ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
    } catch {
        return next(new AppError(401, "Google sign-in token is invalid or expired"));
    }

    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
        return next(new AppError(401, "Google account email could not be verified"));
    }
    const { sub: googleId, email, name } = payload;
    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({
        $or: [{ googleId }, { email: normalizedEmail }],
    });

    if (user) {
        if (!user.googleId) {
            user.googleId = googleId;
            user.authProvider = "google";
            await user.save({ validateBeforeSave: false });
        }
    } else {
        user = await User.create({
            name,
            email: normalizedEmail,
            googleId,
            authProvider: "google",
        });
    }

    createSendToken(user, 200, res);
};

// 4. Protect Route Middleware
exports.protect = async (req, res, next) => {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return next(
            new AppError(
                401,
                "You are not logged in! Please log in to get access.",
            ),
        );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
        return next(new AppError(401, "The user no longer exists."));
    }

    // Check if user changed password after the JWT was issued
    if (
        currentUser.changedPasswordAfter &&
        currentUser.changedPasswordAfter(decoded.iat)
    ) {
        return next(
            new AppError(
                401,
                "User recently changed password! Please log in again.",
            ),
        );
    }

    req.user = currentUser;
    next();
};

// 5. Restrict to specific roles
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    403,
                    "You do not have permission to perform this action",
                ),
            );
        }
        next();
    };
};

// 6. Forgot Password Handler
exports.handleForgotPassword = async function (req, res, next) {
    const { email } = req.body;

    if (!email) {
        return next(new AppError(400, "Please provide an email address."));
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        return res.status(200).json({
            status: "success",
            message: "If an account exists for that email, a reset link has been sent.",
        });
    }

    const resetToken = await user.generateResetToken();
    await user.save({ validateBeforeSave: false });

    try {
        await sendEmail({
            email: normalizedEmail,
            from: "Darzaani Boutique and Tailors <no-reply@darzaani.com>",
            subject: "Password reset token [valid for 5 minutes]",
            url: `${(process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "")}/reset-password/${resetToken}`,
        });

        res.status(200).json({
            status: "success",
            message: "If an account exists for that email, a reset link has been sent.",
        });
    } catch (err) {
        user.resetToken = undefined;
        user.resetTokenValidity = undefined;

        await user.save({ validateBeforeSave: false });

        return next(
            new AppError(
                500,
                "There was a problem sending email. Try again later!",
            ),
        );
    }
};

// 7. Reset Password Handler
exports.handleResetPassword = async function (req, res, next) {
    const { resetToken } = req.params;

    if (!resetToken) {
        return next(
            new AppError(400, "There is no reset password token received"),
        );
    }

    const { password, passwordConfirm } = req.body || {};

    if (!password || !passwordConfirm) {
        return next(
            new AppError(
                400,
                "Please provide both password and passwordConfirm to reset your password",
            ),
        );
    }

    if (password !== passwordConfirm) {
        return next(new AppError(400, "Both passwords should match"));
    }

    const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    const user = await User.findOne({
        resetToken: hashedToken,
        resetTokenValidity: { $gt: Date.now() },
    });

    if (!user) {
        return next(
            new AppError(400, "The reset token is invalid or has expired"),
        );
    }

    user.password = password;
    user.passwordConfirm = passwordConfirm;
    user.passwordChangedAt = Date.now() - 1000;

    user.resetToken = undefined;
    user.resetTokenValidity = undefined;

    await user.save();

    createSendToken(user, 200, res);
};
