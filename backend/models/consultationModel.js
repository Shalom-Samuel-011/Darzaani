const mongoose = require("mongoose");
const validator = require("validator");

const consultationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please provide your name"],
            trim: true,
            maxlength: 80,
        },
        email: {
            type: String,
            required: [true, "Please provide your email address"],
            trim: true,
            lowercase: true,
            maxlength: 254,
            validate: [validator.isEmail, "Please provide a valid email address"],
        },
        phone: {
            type: String,
            required: [true, "Please provide your phone number"],
            trim: true,
            minlength: 7,
            maxlength: 20,
        },
        preferredDate: {
            type: Date,
            required: [true, "Please choose a preferred date"],
        },
        preferredTime: {
            type: String,
            required: true,
            enum: ["10:00–12:00", "12:00–14:00", "14:00–16:00", "16:00–18:00"],
        },
        consultationType: {
            type: String,
            required: true,
            enum: ["atelier", "video"],
        },
        garmentInterest: {
            type: String,
            required: true,
            enum: ["Sarees & blouses", "Kurtis & sets", "Lehengas", "Something else"],
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        status: {
            type: String,
            enum: ["requested", "confirmed", "completed", "cancelled"],
            default: "requested",
            index: true,
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("Consultation", consultationSchema);
