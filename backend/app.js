const express = require("express");
const cors = require("cors");
const path = require("path");
const userRoutes = require("./routers/userRouter");
const garmentsRoutes = require("./routers/garmentsRouter");
const orderRoutes = require("./routers/orderRouter");
const consultationRoutes = require("./routers/consultationRouter");
const branchRoutes = require("./routers/branchRouter");
const adminRoutes = require("./routers/adminRouter");
const managerRoutes = require("./routers/managerRouter");
const orderController = require("./controllers/ordersController");
const globalError = require("./controllers/errorController");

const app = express();

// Middlewares:

const corsOrigin = process.env.FRONTEND_URL || "http://localhost:3000";
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            const allowed = corsOrigin
                .split(",")
                .map((o) => o.trim())
                .filter(Boolean);
            if (allowed.includes(origin)) return callback(null, true);
            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    })
);
app.use("/uploads", express.static(path.join(__dirname, "uploads"), { maxAge: "1y", immutable: true }));
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
app.use("/api/v1/branches", branchRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/manager", managerRoutes);

// Global Error:

app.use(globalError);

module.exports = app;
