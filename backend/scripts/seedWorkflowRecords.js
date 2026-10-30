const path = require("path");
const dns = require("dns");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Branch = require("../models/branchModel");
const Consultation = require("../models/consultationModel");
const Garment = require("../models/garmentsModel");
const Order = require("../models/ordersModel");
const User = require("../models/userModel");

dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const DAY = 24 * 60 * 60 * 1000;
const consultationSeeds = [
  { token: "cp", branchCode: "del-cp-01", days: 4, slot: "10:00", time: "10:00–11:00", name: "Meera Kapoor", email: "meera.demo@darzaani.com", phone: "+91 98765 43001", type: "atelier", interest: "Lehengas", status: "confirmed" },
  { token: "sx", branchCode: "del-sx-02", days: 5, slot: "15:00", time: "15:00–16:00", name: "Ananya Rao", email: "ananya.demo@darzaani.com", phone: "+91 98765 43002", type: "video", interest: "Sarees & blouses", status: "requested" },
  { token: "ggn", branchCode: "del-ggn-03", days: 6, slot: "17:00", time: "17:00–18:00", name: "Zoya Malhotra", email: "zoya.demo@darzaani.com", phone: "+91 98765 43003", type: "atelier", interest: "Kurtis & sets", status: "requested" },
];

function futureDate(days) {
  const date = new Date(Date.now() + days * DAY);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

async function seedWorkflowRecords() {
  if (!process.env.DB_STRING || !process.env.DB_PASSWORD) {
    throw new Error("DB_STRING and DB_PASSWORD must be set in config.env");
  }

  const databaseUri = process.env.DB_STRING.replace(
    "<db_password>",
    encodeURIComponent(process.env.DB_PASSWORD),
  );
  await mongoose.connect(databaseUri, { serverSelectionTimeoutMS: 15000 });

  const [branches, customer, garments, legacyOrderCount, legacyConsultationCount] = await Promise.all([
    Branch.find({ isActive: true }).lean(),
    User.findOne({ email: "customer@darzaani.com", role: "customer" }).select("_id").lean(),
    Garment.find({ isAvailable: true }).lean(),
    Order.countDocuments({ $or: [{ branch: { $exists: false } }, { branch: null }] }),
    Consultation.countDocuments({ $or: [{ branch: { $exists: false } }, { branch: null }] }),
  ]);

  const branchesByCode = new Map(branches.map((branch) => [branch.code.toLowerCase(), branch]));
  const requiredBranchCodes = ["del-cp-01", "del-sx-02", "del-ggn-03"];
  const missingBranches = requiredBranchCodes.filter((code) => !branchesByCode.has(code));
  if (missingBranches.length) throw new Error(`Missing active demo branches: ${missingBranches.join(", ")}. Seed branches first.`);
  if (!customer) throw new Error("No demo customer account exists. Seed demo users first.");
  if (!garments.length) throw new Error("No available garments exist. Seed the catalog first.");

  const tailors = await User.find({ role: "tailor" }).select("_id branch").lean();
  const missingTailorBranches = requiredBranchCodes.filter((code) => {
    const branch = branchesByCode.get(code);
    return !tailors.some((tailor) => String(tailor.branch) === String(branch._id));
  });
  if (missingTailorBranches.length) throw new Error(`No demo tailor is assigned to branches: ${missingTailorBranches.join(", ")}. Seed branches first.`);
  const garmentsByCategory = new Map();
  for (const garment of garments) {
    if (!garmentsByCategory.has(garment.category)) garmentsByCategory.set(garment.category, garment);
  }
  const orderSeeds = [
    { token: "cp", branchCode: "del-cp-01", category: "Lehengas", days: 2, status: "order_placed" },
    { token: "sx", branchCode: "del-sx-02", category: "Sarees & Blouses", days: 3, status: "assigned_to_tailor" },
    { token: "ggn", branchCode: "del-ggn-03", category: "Kurtis & Sets", days: 4, status: "stitching" },
  ];

  for (const seed of orderSeeds) {
    const branch = branchesByCode.get(seed.branchCode);
    const garment = garmentsByCategory.get(seed.category) || garments[0];
    const tailor = tailors.find((candidate) => String(candidate.branch) === String(branch._id));
    const checkoutRequestId = `darzaani-demo-order-${seed.token}`;
    await Order.updateOne(
      { checkoutRequestId },
      {
        $set: { customer: customer._id },
        $setOnInsert: {
          branch: branch._id,
          ...(seed.status === "order_placed" || !tailor ? {} : { assignedTailor: tailor._id }),
          items: [{
            garment: garment._id,
            sizingTypeUsed: garment.sizingType === "standard_only" ? "standard" : "custom",
            ...(garment.sizingType === "standard_only" ? { selectedStandardSize: "M" } : {}),
            selectedColor: garment.availableColors?.[0],
            itemPrice: garment.basePrice,
            quantity: 1,
          }],
          status: seed.status,
          totalAmount: garment.basePrice,
          advancePaid: garment.basePrice,
          paymentStatus: "paid",
          payment: { provider: "razorpay", currency: "INR", amount: garment.basePrice * 100, verifiedAt: new Date() },
          checkoutRequestId,
          deliveryAddress: {
            street: branch.address.street,
            city: branch.address.city,
            state: branch.address.state,
            pincode: branch.address.pincode,
            phone: customer.phone || "+91 98765 43210",
          },
          estimatedCompletionDate: futureDate(seed.days + 14),
          workflowHistory: [{ type: "payment_confirmed", toStatus: seed.status, note: "Demo workflow record seeded with branch assignment." }],
        },
      },
      { upsert: true, runValidators: true },
    );
  }

  for (const seed of consultationSeeds) {
    const branch = branchesByCode.get(seed.branchCode);
    const date = futureDate(seed.days);
    const token = `[Demo seed: consultation-${seed.token}]`;
    await Consultation.updateOne(
      { notes: { $regex: `^\\[Demo seed: consultation-${seed.token}\\]` } },
      {
        $setOnInsert: {
          name: seed.name,
          email: seed.email,
          phone: seed.phone,
          preferredDate: date,
          preferredTime: seed.time,
          timeSlotKey: seed.slot,
          consultationType: seed.type,
          garmentInterest: seed.interest,
          notes: `${token} Sample booking for exploring the branch consultation workflow.`,
          status: seed.status,
          branch: branch._id,
        },
      },
      { upsert: true, runValidators: true },
    );
  }

  const removedOrders = await Order.deleteMany({ $or: [{ branch: { $exists: false } }, { branch: null }] });
  const removedConsultations = await Consultation.deleteMany({ $or: [{ branch: { $exists: false } }, { branch: null }] });
  const [seededOrders, seededConsultations, remainingBranchlessOrders, remainingBranchlessConsultations] = await Promise.all([
    Order.countDocuments({ checkoutRequestId: /^darzaani-demo-order-/ }),
    Consultation.countDocuments({ notes: /^\[Demo seed: consultation-/ }),
    Order.countDocuments({ $or: [{ branch: { $exists: false } }, { branch: null }] }),
    Consultation.countDocuments({ $or: [{ branch: { $exists: false } }, { branch: null }] }),
  ]);

  console.log(JSON.stringify({
    database: mongoose.connection.name,
    removedLegacyOrders: removedOrders.deletedCount,
    removedLegacyConsultations: removedConsultations.deletedCount,
    existingBranchlessOrdersFound: legacyOrderCount,
    existingBranchlessConsultationsFound: legacyConsultationCount,
    seededOrders,
    seededConsultations,
    remainingBranchlessOrders,
    remainingBranchlessConsultations,
  }, null, 2));
}

seedWorkflowRecords()
  .catch((error) => {
    console.error("Could not seed branch-linked workflow records:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
