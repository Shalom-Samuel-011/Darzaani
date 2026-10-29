const path = require("path");
const dns = require("dns");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Garment = require("../models/garmentsModel");
const garments = require("../data/garmentCatalog");

dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config({ path: path.join(__dirname, "..", "config.env") });

async function seedGarments() {
    if (!process.env.DB_STRING || !process.env.DB_PASSWORD) {
        throw new Error("DB_STRING and DB_PASSWORD must be set in config.env");
    }

    const databaseUri = process.env.DB_STRING.replace(
        "<db_password>",
        encodeURIComponent(process.env.DB_PASSWORD),
    );

    await mongoose.connect(databaseUri);

    const result = await Garment.bulkWrite(
        garments.map((garment) => ({
            updateOne: {
                filter: {
                    name: garment.name,
                    category: garment.category,
                },
                update: { $setOnInsert: garment },
                upsert: true,
            },
        })),
        { ordered: true },
    );

    console.log(
        `Catalog seed complete: ${result.upsertedCount} inserted; ${result.matchedCount} already present; ${garments.length} total sample products.`,
    );
}

seedGarments()
    .catch((error) => {
        console.error("Could not seed the sample catalog:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
