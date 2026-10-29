const mongoose = require("mongoose");

const paymentWebhookEventSchema = new mongoose.Schema(
    {
        eventId: { type: String, required: true, unique: true },
        eventType: { type: String, required: true },
        processedAt: Date,
    },
    { timestamps: true },
);

module.exports = mongoose.model("PaymentWebhookEvent", paymentWebhookEventSchema);
