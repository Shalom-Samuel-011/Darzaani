const path = require("path");
const dns = require("dns");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("../models/userModel");

dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const DEMO_USERS = [
  {
    name: "Master Admin",
    email: "admin@darzaani.com",
    password: "Admin123",
    passwordConfirm: "Admin123",
    role: "master-admin",
  },
  {
    name: "Branch Manager",
    email: "manager@darzaani.com",
    password: "Manager123",
    passwordConfirm: "Manager123",
    role: "branch-manager",
    phone: "+91 98765 43210",
  },
  {
    name: "Senior Tailor",
    email: "tailor@darzaani.com",
    password: "Tailor123",
    passwordConfirm: "Tailor123",
    role: "tailor",
    phone: "+91 98765 43211",
  },
  {
    name: "South Extension Manager",
    email: "manager.south@darzaani.com",
    password: "Manager123",
    passwordConfirm: "Manager123",
    role: "branch-manager",
    phone: "+91 98765 43212",
  },
  {
    name: "Cyber City Manager",
    email: "manager.gurgaon@darzaani.com",
    password: "Manager123",
    passwordConfirm: "Manager123",
    role: "branch-manager",
    phone: "+91 98765 43213",
  },
  {
    name: "Asha Verma",
    email: "asha.tailor@darzaani.com",
    password: "Tailor123",
    passwordConfirm: "Tailor123",
    role: "tailor",
    phone: "+91 98765 43214",
  },
  {
    name: "Rohan Singh",
    email: "rohan.tailor@darzaani.com",
    password: "Tailor123",
    passwordConfirm: "Tailor123",
    role: "tailor",
    phone: "+91 98765 43215",
  },
  {
    name: "Demo Customer",
    email: "customer@darzaani.com",
    password: "Customer123",
    passwordConfirm: "Customer123",
    role: "customer",
  },
];

async function seedDemoUsers() {
  if (!process.env.DB_STRING || !process.env.DB_PASSWORD) {
    throw new Error("DB_STRING and DB_PASSWORD must be set in config.env");
  }

  const databaseUri = process.env.DB_STRING.replace(
    "<db_password>",
    encodeURIComponent(process.env.DB_PASSWORD),
  );

  await mongoose.connect(databaseUri);

  console.log("Seeding demo users...");

  for (const userData of DEMO_USERS) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      if (userData.phone && !existing.phone) {
        await User.updateOne({ _id: existing._id }, { $set: { phone: userData.phone } });
      }
      console.log(`  ${userData.email} already exists, skipping...`);
      continue;
    }

    const user = await User.create(userData);
    console.log(`  Created ${user.role}: ${user.email}`);
  }

  console.log("Demo users seed complete!");
}

seedDemoUsers()
  .catch((error) => {
    console.error("Could not seed demo users:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
