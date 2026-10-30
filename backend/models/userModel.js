const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const measurementSchema = new mongoose.Schema(
    {
        profileTitle: {
            type: String,
            default: "Base Fit",
            trim: true,
        },
        unit: {
            type: String,
            enum: ["inches", "cm"],
            default: "inches",
        },
        shoulders: Number,
        chest: Number,
        bust: Number,
        underBust: Number,
        waistUpper: Number, // Natural waist (useful for high-waisted blouses/tops)
        armhole: Number,
        bicep: Number,
        sleeveLength: Number,
        sleeveOpening: Number, // Wrist / Cuff
        frontNeckDepth: Number,
        backNeckDepth: Number,
        blouseLength: Number,
        kurtiLength: Number,

        // --- LOWER BODY / LEHENGA / PANTS / SALWAR ---
        waistLower: Number, // Lower waist (where Lehenga/Pants actually sit)
        hip: Number,
        thigh: Number,
        knee: Number,
        calf: Number,
        ankleOpening: Number, // Bottom hem width (e.g. Churidar vs. Palazzo)
        crotchDepth: Number, // Inseam / Rise calculation for trousers/salwar
        pantLength: Number, // Outer length from waist to hem
        lehengaLength: Number, // Waist-to-floor length for skirts/lehengas

        // --- FULL BODY / OVERALL ---
        fullLength: Number, // Shoulder to floor (e.g. Anarkali, Gowns, Dresses)
        crossBack: Number, // Across shoulder blades

        // --- FLEXIBLE CUSTOM NOTES ---
        notes: {
            type: String,
            trim: true, // e.g. "Prefers slightly loose armholes" or "Padded choli preference"
        },
    },
    { _id: true, timestamps: true },
);

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please tell us your name!"],
            trim: true,
            maxlength: [
                50,
                "A user name must have less or equal than 50 characters",
            ],
        },
        email: {
            type: String,
            required: [true, "Please provide your email"],
            unique: true,
            lowercase: true,
            validate: [validator.isEmail, "Please provide a valid email"],
        },
        phone: {
            type: String,
            trim: true,
        },
        role: {
            type: String,
            enum: ["master-admin", "branch-manager", "tailor", "customer"],
            default: "customer",
        },
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
        },

        googleId: {
            type: String,
            unique: true,
            sparse: true,
        },
        authProvider: {
            type: String,
            enum: ["local", "google"],
            default: "local",
            select: false,
        },
        password: {
            type: String,
            required: [
                function () {
                    return !this.googleId;
                },
                "Please provide a password",
            ],
            minlength: [8, "Password must be at least 8 characters"],
            validate: {
                validator: function (password) {
                    return !password || /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
                },
                message: "Password must include an uppercase letter, a lowercase letter, and a number",
            },
            select: false,
        },
        passwordConfirm: {
            type: String,
            required: [
                function () {
                    // Confirm the password when a local account is created.
                    // Existing users save this document for unrelated changes
                    // (such as measurement profiles) and have no confirmation value.
                    return this.isNew && !this.googleId;
                },
                "Please confirm your password",
            ],
            validate: {
                validator: function (el) {
                    return !this.isModified("password") || el === this.password;
                },
                message: "Passwords are not the same!",
            },
        },
        passwordChangedAt: Date,
        measurements: [measurementSchema],
        cartItems: [
            {
                garment: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Garment",
                    required: true,
                },
                sizingTypeUsed: {
                    type: String,
                    enum: ["custom", "standard"],
                    required: true,
                },
                selectedStandardSize: {
                    type: String,
                    enum: ["XS", "S", "M", "L", "XL", "XXL", "Free Size"],
                },
                selectedMeasurementProfileId: String,
                selectedColor: { type: String, required: true, trim: true },
                quantity: { type: Number, min: 1, max: 99, default: 1 },
            },
        ],
        active: {
            type: Boolean,
            default: true,
            select: false,
        },
        resetToken: {
            type: String,
            select: false,
        },
        resetTokenValidity: {
            type: Date,
            select: false,
        },
    },
    {
        timestamps: true,
    },
);

// Hash password before saving
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
});

// Filter out inactive users on all find queries
userSchema.pre(/^find/, function () {
    this.find({ active: { $ne: false } });
});

// Instance method to check password validity
userSchema.methods.correctPassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user changed password after token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10,
        );
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

// Generate password reset token
userSchema.methods.generateResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString("hex");

    this.resetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    this.resetTokenValidity = Date.now() + 5 * 60 * 1000;

    return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
