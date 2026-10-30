const Consultation = require("../models/consultationModel");
const Branch = require("../models/branchModel");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");
const consultationSlots = require("../utils/consultationSlots");

const parseConsultationDate = (date) => {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const parsed = new Date(`${date}T12:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? null : parsed;
};

const consultationDayRange = (date) => {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { $gte: start, $lt: end };
};

const indiaDateTime = () => Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date()).map(({ type, value }) => [type, value]),
);

const isSlotInPast = (date, slotKey) => {
    const now = indiaDateTime();
    const today = `${now.year}-${now.month}-${now.day}`;
    if (date !== today) return false;
    const [hour, minute] = slotKey.split(":").map(Number);
    return Number(now.hour) * 60 + Number(now.minute) >= hour * 60 + minute;
};

const getUnavailableSlots = async (branchId, date) => {
    const bookings = await Consultation.find({
        branch: branchId,
        preferredDate: consultationDayRange(date),
        status: { $in: ["requested", "confirmed"] },
    }).select("preferredTime timeSlotKey").lean();
    const unavailable = new Set();

    for (const booking of bookings) {
        if (booking.timeSlotKey) {
            unavailable.add(booking.timeSlotKey);
            continue;
        }

        // Reserve overlapping one-hour choices for older two-hour bookings.
        const legacyRange = String(booking.preferredTime || "").match(/(\d{1,2}):(\d{2}).*?(\d{1,2}):(\d{2})/);
        if (!legacyRange) continue;
        const legacyStart = Number(legacyRange[1]) * 60 + Number(legacyRange[2]);
        const legacyEnd = Number(legacyRange[3]) * 60 + Number(legacyRange[4]);
        for (const slot of consultationSlots) {
            const [hour, minute] = slot.key.split(":").map(Number);
            const slotStart = hour * 60 + minute;
            if (slotStart < legacyEnd && slotStart + 60 > legacyStart) unavailable.add(slot.key);
        }
    }
    return unavailable;
};

exports.getConsultationAvailability = async (req, res, next) => {
    const date = req.query.date;
    const branchId = req.query.branch;
    if (!parseConsultationDate(date)) return next(new AppError(400, "Choose a valid consultation date."));
    if (!mongoose.isValidObjectId(branchId)) return next(new AppError(400, "Choose a valid atelier."));
    const branch = await Branch.findOne({ _id: branchId, isActive: true }).select("_id");
    if (!branch) return next(new AppError(404, "This atelier is unavailable."));

    const unavailable = await getUnavailableSlots(branch._id, date);
    res.status(200).json({ status: "success", data: {
        slots: consultationSlots.map((slot) => ({ ...slot, available: !unavailable.has(slot.key) && !isSlotInPast(date, slot.key) })),
    } });
};

exports.createConsultation = async (req, res, next) => {
    const {
        name,
        email,
        phone,
        preferredDate,
        timeSlotKey,
        consultationType,
        garmentInterest,
        notes,
        branch,
    } = req.body || {};

    if (!name?.trim() || !email?.trim() || !phone?.trim() || !preferredDate) {
        return next(new AppError(400, "Please complete all required contact and scheduling fields"));
    }

    const requestedDate = parseConsultationDate(preferredDate);
    if (!requestedDate) {
        return next(new AppError(400, "Please choose a valid consultation date"));
    }

    const requestedDayEnd = new Date(`${preferredDate}T23:59:59.999Z`);
    if (requestedDayEnd < new Date()) {
        return next(new AppError(400, "The consultation date must be today or later"));
    }

    if (!mongoose.isValidObjectId(branch)) return next(new AppError(400, "Choose an atelier for your consultation."));
    const selectedBranch = await Branch.findOne({ _id: branch, isActive: true }).select("_id");
    if (!selectedBranch) return next(new AppError(404, "This atelier is unavailable."));
    const slot = consultationSlots.find((availableSlot) => availableSlot.key === timeSlotKey);
    if (!slot) return next(new AppError(400, "Choose a consultation time during atelier opening hours."));
    if (isSlotInPast(preferredDate, slot.key)) return next(new AppError(409, "That consultation time has already passed. Please choose a later time."));

    const unavailable = await getUnavailableSlots(selectedBranch._id, preferredDate);
    if (unavailable.has(slot.key)) return next(new AppError(409, "That consultation time has just been booked. Please choose another available time."));

    let consultation;
    try {
        consultation = await Consultation.create({
            name,
            email,
            phone,
            preferredDate: requestedDate,
            preferredTime: slot.value,
            timeSlotKey: slot.key,
            consultationType,
            garmentInterest,
            notes,
            branch: selectedBranch._id,
        });
    } catch (error) {
        if (error.code === 11000) return next(new AppError(409, "That consultation time has just been booked. Please choose another available time."));
        throw error;
    }

    res.status(201).json({
        status: "success",
        data: { consultation },
    });
};

exports.getAllConsultations = async (req, res) => {
    let filter = {};
    if (req.user?.role === "branch-manager" && req.user.branch) {
        filter.branch = req.user.branch;
    } else if (req.query.branch) {
        filter.branch = req.query.branch;
    }

    const consultations = await Consultation.find(filter)
        .populate("branch", "name code address phone")
        .sort("-createdAt");

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
