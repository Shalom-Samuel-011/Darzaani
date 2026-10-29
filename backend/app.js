const express = require("express");
const cors = require("cors");
const userRoutes = require("./routers/userRouter");
const garmentsRoutes = require("./routers/garmentsRouter");
const orderRoutes = require("./routers/orderRouter");
const consultationRoutes = require("./routers/consultationRouter");
const orderController = require("./controllers/ordersController");
const globalError = require("./controllers/errorController");

const app = express();

// Middlewares:

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
// Razorpay signs the exact request bytes, so this must run before express.json().
app.post(
    "/api/v1/webhooks/razorpay",
    express.raw({ type: "application/json", limit: "1mb" }),
    orderController.handleRazorpayWebhook,
);
app.use(express.json());

// Routers:

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/garments", garmentsRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1/consultations", consultationRoutes);

// Global Error:

app.use(globalError);

module.exports = app;
