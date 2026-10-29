const express = require("express");
const cors = require("cors");
const userRoutes = require("./routers/userRouter");
const garmentsRoutes = require("./routers/garmentsRouter");
const orderRoutes = require("./routers/orderRouter");
const consultationRoutes = require("./routers/consultationRouter");
const globalError = require("./controllers/errorController");

const app = express();

// Middlewares:

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

// Routers:

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/garments", garmentsRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1/consultations", consultationRoutes);

// Global Error:

app.use(globalError);

module.exports = app;
