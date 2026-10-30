const path = require("path");
const dns = require("dns");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Branch = require("../models/branchModel");
const User = require("../models/userModel");

dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const DELHI_BRANCHES = [
    {
        name: "Darzaani Flagship — Connaught Place",
        code: "DEL-CP-01",
        address: {
            street: "Block M, Middle Circle, Connaught Place",
            city: "New Delhi",
            state: "Delhi",
            pincode: "110001",
        },
        phone: "+91 11 4321 0001",
        // GeoJSON: [longitude, latitude]
        location: {
            type: "Point",
            coordinates: [77.2167, 28.6315],
        },
        isActive: true,
    },
    {
        name: "Darzaani Atelier — South Extension",
        code: "DEL-SX-02",
        address: {
            street: "Part II, Main Market, South Extension",
            city: "New Delhi",
            state: "Delhi",
            pincode: "110049",
        },
        phone: "+91 11 4321 0002",
        location: {
            type: "Point",
            coordinates: [77.2219, 28.5683],
        },
        isActive: true,
    },
    {
        name: "Darzaani Studio — Cyber City",
        code: "DEL-GGN-03",
        address: {
            street: "DLF CyberHub, Phase 2, Sector 24",
            city: "Gurgaon",
            state: "Haryana",
            pincode: "122002",
        },
        phone: "+91 124 432 0003",
        location: {
            type: "Point",
            coordinates: [77.0888, 28.495],
        },
        isActive: true,
    },
];

async function seedBranches() {
    if (!process.env.DB_STRING || !process.env.DB_PASSWORD) {
        throw new Error("DB_STRING and DB_PASSWORD must be configured in config.env");
    }

    const databaseUri = process.env.DB_STRING.replace(
        "<db_password>",
        encodeURIComponent(process.env.DB_PASSWORD),
    );

    console.log("Connecting to MongoDB Atlas to seed branches...");
    await mongoose.connect(databaseUri);

    // Grab our demo branch manager so we can link them to the flagship store
    const branchManager = await User.findOne({ role: "branch-manager" });

    for (const branchData of DELHI_BRANCHES) {
        const existing = await Branch.findOne({ code: branchData.code });
        if (existing) {
            console.log(`  ✓ Branch '${branchData.name}' already exists.`);
            continue;
        }

        // Attach the branch manager to the Connaught Place flagship
        if (branchData.code === "DEL-CP-01" && branchManager) {
            branchData.manager = branchManager._id;
        }

        const newBranch = await Branch.create(branchData);
        console.log(`  + Created branch: ${newBranch.name} (${newBranch.code})`);

        // If this is the Connaught Place branch, also link the branch back to the manager user
        if (branchData.code === "DEL-CP-01" && branchManager) {
            branchManager.branch = newBranch._id;
            await branchManager.save({ validateBeforeSave: false });
            console.log(`    ↳ Linked Branch Manager (${branchManager.email}) to this branch.`);
        }
    }

    const branchAssignments = {
        "DEL-CP-01": {
            managerEmail: "manager@darzaani.com",
            tailorEmails: ["tailor@darzaani.com"],
        },
        "DEL-SX-02": {
            managerEmail: "manager.south@darzaani.com",
            tailorEmails: ["asha.tailor@darzaani.com"],
        },
        "DEL-GGN-03": {
            managerEmail: "manager.gurgaon@darzaani.com",
            tailorEmails: ["rohan.tailor@darzaani.com"],
        },
    };

    for (const [branchCode, assignment] of Object.entries(branchAssignments)) {
        const branch = await Branch.findOne({ code: branchCode });
        if (!branch) continue;

        const branchManager = await User.findOne({ email: assignment.managerEmail });
        if (branchManager) {
            branch.manager = branchManager._id;
            await branch.save();
            branchManager.branch = branch._id;
            await branchManager.save({ validateBeforeSave: false });
        }

        for (const tailorEmail of assignment.tailorEmails) {
            const tailor = await User.findOne({ email: tailorEmail });
            if (!tailor) continue;
            tailor.branch = branch._id;
            await tailor.save({ validateBeforeSave: false });
        }
    }

    console.log("Branch seeding completed successfully!");
}

seedBranches()
    .catch((err) => {
        console.error("Failed to seed branches:", err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
