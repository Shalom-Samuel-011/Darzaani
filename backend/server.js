const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const mongoose = require("mongoose");
const app = require("./app");
const Garment = require("./models/garmentsModel");
const sampleGarments = require("./data/garmentCatalog");

// 1. Build DB connection URI with safe password encoding
const DB = process.env.DB_STRING.replace(
    "<db_password>",
    encodeURIComponent(process.env.DB_PASSWORD),
);

// 2. Connect to MongoDB
console.log("Connecting to MongoDB Atlas...");

mongoose
    .connect(DB)
    .then(async () => {
        console.log("DB connection successful!");

        // Seed demo users in development only
        if (process.env.NODE_ENV !== "production") {
            const User = require("./models/userModel");
            const demoUsers = [
                { name: "Master Admin", email: "admin@darzaani.com", password: "Admin123", role: "master-admin" },
                { name: "Branch Manager", email: "manager@darzaani.com", password: "Manager123", role: "branch-manager" },
                { name: "Senior Tailor", email: "tailor@darzaani.com", password: "Tailor123", role: "tailor" },
                { name: "Demo Customer", email: "customer@darzaani.com", password: "Customer123", role: "customer" },
            ];

            for (const user of demoUsers) {
                const exists = await User.findOne({ email: user.email });
                if (!exists) {
                    await User.create(user);
                    console.log(`  Created demo user: ${user.email} (${user.role})`);
                }
            }
        }

        if (process.env.NODE_ENV !== "production") {
            // ... existing garment seeding code ...
            const garmentCount = await Garment.countDocuments();
            if (garmentCount === 0) {
                await Garment.insertMany(sampleGarments);
                console.log(
                    `Added ${sampleGarments.length} sample garments to the development catalog.`,
                );
            } else {
                const colorUpdates = await Garment.bulkWrite(
                    sampleGarments.map((garment) => ({
                        updateOne: {
                            filter: {
                                name: garment.name,
                                category: garment.category,
                                availableColors: { $exists: false },
                            },
                            update: {
                                $set: {
                                    availableColors: garment.availableColors,
                                },
                            },
                        },
                    })),
                );
                if (colorUpdates.modifiedCount > 0) {
                    console.log(
                        `Added colour options to ${colorUpdates.modifiedCount} sample garments.`,
                    );
                }
            }
        }
    })
    .catch((err) => {
        console.error("DB connection error:", err);
        process.exit(1);
    });

// 3. Start Express Server
const port = process.env.PORT || 2000;
const server = app.listen(port, () => {
    console.log(
        `Darzaani running on port ${port} in ${process.env.NODE_ENV} mode`,
    );
});

// Unhandled Rejection Safeguard
process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION! Shutting down...");
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});
