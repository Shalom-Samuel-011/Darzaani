const Consultation = require("../models/consultationModel");
const AppError = require("../utils/appError");

exports.createConsultation = async (req, res, next) => {
    const {
        name,
        email,
        phone,
        preferredDate,
        preferredTime,
        consultationType,
        garmentInterest,
        notes,
    } = req.body || {};

    if (!name?.trim() || !email?.trim() || !phone?.trim() || !preferredDate) {
        return next(new AppError(400, "Please complete all required contact and scheduling fields"));
    }

    const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(preferredDate);
    const requestedDate = dateMatch ? new Date(`${preferredDate}T12:00:00.000Z`) : null;
    if (
        !requestedDate ||
        Number.isNaN(requestedDate.getTime()) ||
        requestedDate.toISOString().slice(0, 10) !== preferredDate
    ) {
        return next(new AppError(400, "Please choose a valid consultation date"));
    }

    const requestedDayEnd = new Date(`${preferredDate}T23:59:59.999Z`);
    if (requestedDayEnd < new Date()) {
        return next(new AppError(400, "The consultation date must be today or later"));
    }

    const consultation = await Consultation.create({
        name,
        email,
        phone,
        preferredDate: requestedDate,
        preferredTime,
        consultationType,
        garmentInterest,
        notes,
    });

    res.status(201).json({
        status: "success",
        data: { consultation },
    });
};

exports.getAllConsultations = async (req, res) => {
    const consultations = await Consultation.find().sort("-createdAt");
    res.status(200).json({
        status: "success",
        results: consultations.length,
        data: { consultations },
    });
};

exports.updateConsultationStatus = async (req, res, next) => {
    const consultation = await Consultation.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true, runValidators: true },
    );

    if (!consultation) {
        return next(new AppError(404, "No consultation request found with that ID"));
    }

    res.status(200).json({
        status: "success",
        data: { consultation },
    });
};
