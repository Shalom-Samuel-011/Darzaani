const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/ordersModel");
const User = require("../models/userModel");
const Garment = require("../models/garmentsModel");
const PaymentWebhookEvent = require("../models/paymentWebhookEventModel");
const AppError = require("../utils/appError");
const Branch = require("../models/branchModel");
const { canAdvanceOrder } = require("../utils/orderWorkflow");
const { findFirstAvailableBranch } = require("../utils/inventoryAvailability");
const geocodeAddress = require("../utils/geocoding");

const getRazorpayCredentials = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
        throw new AppError(503, "Payments are not configured yet.");
    }
    return { keyId, keySecret };
};

const razorpayRequest = async (path, { method = "GET", body } = {}) => {
    const { keyId, keySecret } = getRazorpayCredentials();
    let response;
    try {
        response = await fetch(`https://api.razorpay.com/v1${path}`, {
            method,
            headers: {
                Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
                ...(body ? { "Content-Type": "application/json" } : {}),
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
            signal: AbortSignal.timeout(12000),
        });
    } catch {
        throw new AppError(502, "Could not reach the payment provider. Please try again.");
    }

    let payload;
    try {
        payload = await response.json();
    } catch {
        throw new AppError(502, "The payment provider returned an unreadable response.");
    }
    if (!response.ok) {
        const providerError = payload?.error || {};
        // Keep credentials and raw request bodies out of logs; these fields identify
        // configuration/request problems without exposing payment secrets.
        console.error("Razorpay API request failed", {
            status: response.status,
            code: providerError.code,
            field: providerError.field,
            description: providerError.description,
        });
        if (response.status === 401 || response.status === 403) {
            throw new AppError(502, "Razorpay rejected the backend credentials. Check that the key ID and secret are a matching test-mode pair in backend/config.env.");
        }
        if (response.status === 400) {
            throw new AppError(502, "Razorpay rejected the order details. Check the backend terminal for its error code and field.");
        }
        throw new AppError(502, "The payment provider could not process this request.");
    }
    return payload;
};

const safeSignatureMatches = (expectedHex, suppliedHex) => {
    if (typeof suppliedHex !== "string" || !/^[a-f\d]{64}$/i.test(suppliedHex)) {
        return false;
    }
    const expected = Buffer.from(expectedHex, "hex");
    const supplied = Buffer.from(suppliedHex, "hex");
    return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
};

const validateDeliveryAddress = (input) => {
    const address = {
        street: String(input?.street || "").trim(),
        city: String(input?.city || "").trim(),
        state: String(input?.state || "").trim(),
        pincode: String(input?.pincode || "").trim(),
        phone: String(input?.phone || "").trim(),
    };
    if (Object.values(address).some((value) => !value)) {
        throw new AppError(400, "Complete all delivery address fields before payment.");
    }
    if (Object.values(address).some((value) => value.length > 240)) {
        throw new AppError(400, "A delivery address field is too long.");
    }
    if (!/^[0-9+()\s-]{7,20}$/.test(address.phone)) {
        throw new AppError(400, "Enter a valid contact phone number.");
    }
    if (!/^[1-9]\d{5}$/.test(address.pincode)) {
        throw new AppError(400, "Enter a valid six-digit PIN code.");
    }
    return address;
};

const makeCheckoutResponse = (order, keyId) => ({
    localOrderId: order._id.toString(),
    razorpayOrderId: order.payment.razorpayOrderId,
    keyId,
    amount: order.payment.amount,
    currency: order.payment.currency,
});

const buildOrderItemsFromCart = async (user) => {
    if (!user.cartItems?.length) {
        throw new AppError(400, "Your fitting bag is empty.");
    }

    const items = [];
    let amountInPaise = 0;
    for (const cartItem of user.cartItems) {
        const garment = await Garment.findById(cartItem.garment);
        if (!garment || !garment.isAvailable) {
            throw new AppError(409, "A piece in your fitting bag is no longer available.");
        }

        let measurementSnapshot;
        if (cartItem.sizingTypeUsed === "custom") {
            const profile = user.measurements.id(cartItem.selectedMeasurementProfileId);
            if (!profile || garment.sizingType === "standard_only") {
                throw new AppError(409, "A custom-fit profile in your fitting bag is unavailable.");
            }
            measurementSnapshot = profile.toObject();
        } else {
            if (!cartItem.selectedStandardSize || garment.sizingType === "custom_only") {
                throw new AppError(409, "A standard size in your fitting bag is unavailable.");
            }
            if (garment.availableStandardSizes.length && !garment.availableStandardSizes.includes(cartItem.selectedStandardSize)) {
                throw new AppError(409, "A size in your fitting bag is no longer available.");
            }
        }

        if (garment.availableColors.length && !garment.availableColors.includes(cartItem.selectedColor)) {
            throw new AppError(409, "A colour in your fitting bag is no longer available.");
        }
        const unitAmount = Math.round(garment.basePrice * 100);
        if (!Number.isSafeInteger(unitAmount) || unitAmount < 1) {
            throw new AppError(409, "A piece in your fitting bag has an invalid price.");
        }
        amountInPaise += unitAmount * cartItem.quantity;
        if (!Number.isSafeInteger(amountInPaise)) {
            throw new AppError(400, "The fitting bag total is too large to process.");
        }

        items.push({
            garment: garment._id,
            sizingTypeUsed: cartItem.sizingTypeUsed,
            selectedStandardSize: cartItem.selectedStandardSize,
            selectedColor: cartItem.selectedColor,
            measurementSnapshot,
            itemPrice: unitAmount / 100,
            quantity: cartItem.quantity,
        });
    }
    return { items, amountInPaise };
};

const findNearestBranchWithCartInventory = async (user, deliveryAddress, demoLocationBranchId) => {
    if (!user.cartItems?.length) throw new AppError(400, "Your fitting bag is empty.");
    let coordinates;

    if (demoLocationBranchId) {
        if (user.email !== "customer@darzaani.com") {
            throw new AppError(403, "Demo delivery locations are available only to the Demo Customer account.");
        }
        if (!mongoose.isValidObjectId(demoLocationBranchId)) {
            throw new AppError(400, "Choose a valid demo delivery location.");
        }
        const demoLocationBranch = await Branch.findOne({ _id: demoLocationBranchId, isActive: true }).select("location").lean();
        if (!demoLocationBranch?.location?.coordinates?.length) {
            throw new AppError(400, "This demo delivery location is unavailable.");
        }
        coordinates = demoLocationBranch.location.coordinates;
    } else {
        try {
            coordinates = await geocodeAddress(deliveryAddress);
        } catch {
            throw new AppError(503, "We could not check nearby atelier availability right now. Please retry shortly.");
        }
    }
    if (!coordinates) throw new AppError(400, "We could not locate this delivery address. Check the street, city, state, and PIN code.");

    const garmentIds = [...new Set(user.cartItems.map((item) => item.garment.toString()))];
    const garments = await Garment.find({ _id: { $in: garmentIds } }).select("name isAvailable branchAvailability").lean();
    const garmentById = new Map(garments.map((garment) => [garment._id.toString(), garment]));
    const missing = garmentIds.map((id) => garmentById.get(id)).filter((garment) => !garment || !garment.isAvailable);
    if (missing.length) {
        const names = [...new Set(missing.map((garment) => garment?.name || "A selected piece"))];
        throw new AppError(409, `Coming soon: ${names.join(", ")} ${names.length === 1 ? "is" : "are"} currently unavailable.`);
    }

    const branches = await Branch.find({
        isActive: true,
        location: { $near: { $geometry: { type: "Point", coordinates } } },
    }).select("_id name code address").lean();

    const nearestAvailableBranch = findFirstAvailableBranch(branches, garmentIds, garmentById);
    if (nearestAvailableBranch) return nearestAvailableBranch;

    const names = [...new Set(garmentIds.map((id) => garmentById.get(id)?.name || "Selected pieces"))];
    throw new AppError(409, `Coming soon: ${names.join(", ")} ${names.length === 1 ? "is" : "are"} unavailable at every Darzaani atelier.`);
};

// Create the local order and Razorpay order from trusted server-side cart data.
exports.createCheckout = async (req, res) => {
    const { requestId } = req.body;
    if (typeof requestId !== "string" || !/^[\da-f-]{36}$/i.test(requestId)) {
        throw new AppError(400, "Invalid checkout request. Please try again.");
    }
    const deliveryAddress = validateDeliveryAddress(req.body.deliveryAddress);

    let order = await Order.findOne({
        customer: req.user._id,
        checkoutRequestId: requestId,
    });
    let keyId;
    if (order?.paymentStatus === "paid") {
        throw new AppError(409, "This checkout has already been paid.");
    }
    if (order?.payment?.razorpayOrderId) {
        keyId = getRazorpayCredentials().keyId;
        return res.status(200).json({
            status: "success",
            data: { checkout: makeCheckoutResponse(order, keyId) },
        });
    }

    if (!order) {
        const branch = await findNearestBranchWithCartInventory(req.user, deliveryAddress, req.body.demoLocationBranchId);
        const { items, amountInPaise } = await buildOrderItemsFromCart(req.user);
        keyId = getRazorpayCredentials().keyId;
        order = new Order({
            customer: req.user._id,
            branch: branch._id,
            items,
            status: "payment_pending",
            paymentStatus: "pending",
            totalAmount: amountInPaise / 100,
            payment: { provider: "razorpay", currency: "INR", amount: amountInPaise },
            deliveryAddress,
            checkoutRequestId: requestId,
            sourceCartItemIds: req.user.cartItems.map((item) => item._id),
        });
        try {
            await order.save();
        } catch (error) {
            if (error.code !== 11000) throw error;
            order = await Order.findOne({ customer: req.user._id, checkoutRequestId: requestId });
            if (!order) throw error;
        }
    }
    if (!keyId) keyId = getRazorpayCredentials().keyId;

    const lockExpiredAt = new Date(Date.now() - 30000);
    const claim = await Order.findOneAndUpdate(
        {
            _id: order._id,
            "payment.razorpayOrderId": { $exists: false },
            $or: [
                { "payment.razorpayOrderCreationStartedAt": { $exists: false } },
                { "payment.razorpayOrderCreationStartedAt": { $lt: lockExpiredAt } },
            ],
        },
        { $set: { "payment.razorpayOrderCreationStartedAt": new Date() } },
        { new: true },
    );
    if (!claim) {
        const latest = await Order.findById(order._id);
        if (latest?.payment?.razorpayOrderId) {
            return res.status(200).json({ status: "success", data: { checkout: makeCheckoutResponse(latest, keyId) } });
        }
        throw new AppError(409, "Checkout is already being prepared. Please try again shortly.");
    }

    const razorpayOrder = await razorpayRequest("/orders", {
        method: "POST",
        body: {
            amount: claim.payment.amount,
            currency: claim.payment.currency,
            receipt: claim._id.toString(),
            notes: { darzaaniOrderId: claim._id.toString() },
        },
    });
    claim.payment.razorpayOrderId = razorpayOrder.id;
    claim.payment.razorpayOrderCreationStartedAt = undefined;
    await claim.save();

    res.status(201).json({
        status: "success",
        data: { checkout: makeCheckoutResponse(claim, keyId) },
    });
};

const clearOrderedCartItems = async (order) => {
    await User.updateOne(
        { _id: order.customer._id || order.customer },
        { $pull: { cartItems: { _id: { $in: order.sourceCartItemIds || [] } } } },
    );
};

const completePaidOrder = async (order, payment) => {
    if (order.paymentStatus === "paid") {
        if (order.payment.razorpayPaymentId !== payment.id) {
            throw new AppError(409, "A different payment has already been recorded for this order.");
        }
        // Retry this idempotent cleanup in case the process stopped after recording payment.
        await clearOrderedCartItems(order);
        return order;
    }

    const nextStatus = "order_placed";
    const updated = await Order.findOneAndUpdate(
        {
            _id: order._id,
            "payment.razorpayOrderId": payment.order_id,
            paymentStatus: { $ne: "paid" },
        },
        {
            $set: {
                paymentStatus: "paid",
                advancePaid: order.totalAmount,
                status: nextStatus,
                "payment.razorpayPaymentId": payment.id,
                "payment.verifiedAt": new Date(),
            },
            $push: {
                workflowHistory: {
                    type: "payment_confirmed",
                    fromStatus: "payment_pending",
                    toStatus: nextStatus,
                    note: "Payment confirmed.",
                },
            },
        },
        { new: true },
    );

    if (!updated) {
        const current = await Order.findById(order._id);
        if (current?.paymentStatus === "paid" && current.payment.razorpayPaymentId === payment.id) {
            return current;
        }
        throw new AppError(409, "This order payment could not be applied.");
    }

    await clearOrderedCartItems(updated);
    return updated;
};

// Verify Checkout's signature, then confirm/capture the payment with Razorpay.
exports.verifyPayment = async (req, res) => {
    const { keySecret } = getRazorpayCredentials();
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order) throw new AppError(404, "Order not found.");

    const {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
    } = req.body;
    if (
        typeof razorpayOrderId !== "string" ||
        typeof razorpayPaymentId !== "string" ||
        razorpayOrderId !== order.payment?.razorpayOrderId
    ) {
        throw new AppError(400, "Payment details do not match this order.");
    }
    const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${order.payment.razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");
    if (!safeSignatureMatches(expected, razorpaySignature)) {
        throw new AppError(400, "Payment signature could not be verified.");
    }

    let payment = await razorpayRequest(`/payments/${encodeURIComponent(razorpayPaymentId)}`);
    if (
        payment.order_id !== order.payment.razorpayOrderId ||
        payment.amount !== order.payment.amount ||
        payment.currency !== order.payment.currency
    ) {
        throw new AppError(400, "The received payment does not match the order amount.");
    }
    if (payment.status === "authorized" && !payment.captured) {
        try {
            payment = await razorpayRequest(`/payments/${encodeURIComponent(razorpayPaymentId)}/capture`, {
                method: "POST",
                body: { amount: order.payment.amount, currency: order.payment.currency },
            });
        } catch {
            // A capture request can time out after Razorpay captured it; reconcile before reporting failure.
            payment = await razorpayRequest(`/payments/${encodeURIComponent(razorpayPaymentId)}`);
        }
    }
    if (payment.status !== "captured" || payment.captured !== true) {
        throw new AppError(409, "Payment is not captured yet. Please check your order status before retrying.");
    }

    const paidOrder = await completePaidOrder(order, payment);
    res.status(200).json({
        status: "success",
        data: {
            order: {
                _id: paidOrder._id,
                totalAmount: paidOrder.totalAmount,
                status: paidOrder.status,
                paymentStatus: paidOrder.paymentStatus,
            },
        },
    });
};

// Razorpay webhooks provide asynchronous recovery if the browser callback is lost.
exports.handleRazorpayWebhook = async (req, res) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(503).json({ message: "Payment webhook is not configured." });
    if (!Buffer.isBuffer(req.body)) return res.status(415).json({ message: "Expected a raw JSON request body." });

    const signature = req.get("X-Razorpay-Signature");
    const expected = crypto.createHmac("sha256", webhookSecret).update(req.body).digest("hex");
    if (!safeSignatureMatches(expected, signature)) {
        return res.status(400).json({ message: "Invalid webhook signature." });
    }

    let event;
    try {
        event = JSON.parse(req.body.toString("utf8"));
    } catch {
        return res.status(400).json({ message: "Invalid webhook payload." });
    }
    const eventId = req.get("x-razorpay-event-id");
    if (!eventId || typeof event.event !== "string") {
        return res.status(400).json({ message: "Webhook event identity is missing." });
    }

    let receipt = await PaymentWebhookEvent.findOne({ eventId });
    if (receipt?.processedAt) return res.status(200).json({ status: "success" });
    if (!receipt) {
        try {
            receipt = await PaymentWebhookEvent.create({ eventId, eventType: event.event });
        } catch (error) {
            if (error.code !== 11000) throw error;
            receipt = await PaymentWebhookEvent.findOne({ eventId });
            if (receipt?.processedAt) return res.status(200).json({ status: "success" });
        }
    }

    if (event.event === "payment.captured" || event.event === "payment.authorized") {
        let payment = event.payload?.payment?.entity;
        if (!payment?.id || !payment.order_id) {
            return res.status(400).json({ message: "Payment details are invalid." });
        }
        const order = await Order.findOne({ "payment.razorpayOrderId": payment.order_id });
        if (order) {
            if (payment.amount !== order.payment.amount || payment.currency !== order.payment.currency) {
                return res.status(400).json({ message: "Payment amount does not match the order." });
            }
            if (event.event === "payment.authorized" && payment.status === "authorized" && !payment.captured) {
                try {
                    payment = await razorpayRequest(`/payments/${encodeURIComponent(payment.id)}/capture`, {
                        method: "POST",
                        body: { amount: order.payment.amount, currency: order.payment.currency },
                    });
                } catch {
                    payment = await razorpayRequest(`/payments/${encodeURIComponent(payment.id)}`);
                }
            }
            if (payment.status !== "captured" || payment.captured !== true) {
                return res.status(409).json({ message: "Payment has not been captured." });
            }
            await completePaidOrder(order, payment);
        }
    } else if (event.event === "payment.failed") {
        const payment = event.payload?.payment?.entity;
        if (payment?.order_id) {
            await Order.updateOne(
                { "payment.razorpayOrderId": payment.order_id, paymentStatus: { $ne: "paid" } },
                { $set: { paymentStatus: "failed" } },
            );
        }
    }

    await PaymentWebhookEvent.updateOne({ eventId }, { $set: { processedAt: new Date() } });
    return res.status(200).json({ status: "success" });
};

// 2. Get All Orders for Logged-In Customer
exports.getMyOrders = async (req, res, next) => {
    const orders = await Order.find({ customer: req.user._id }).sort(
        "-createdAt",
    );

    res.status(200).json({
        status: "success",
        results: orders.length,
        data: {
            orders,
        },
    });
};

// 3. Get Single Order by ID
exports.getOrder = async (req, res, next) => {
    let orderQuery = Order.findById(req.params.id);
    if (req.user.role === "branch-manager") {
        orderQuery = orderQuery.select("-items.measurementSnapshot -items.referenceImages -deliveryAddress -payment -checkoutRequestId -sourceCartItemIds");
    }
    if (req.user.role === "tailor") {
        orderQuery = orderQuery
            .select("-deliveryAddress -payment -checkoutRequestId -sourceCartItemIds")
            .populate({ path: "customer", select: "name" })
            .populate("workflowHistory.actor", "name role");
    }
    const order = await orderQuery;

    if (!order) {
        return next(new AppError(404, "No order found with that ID"));
    }

    const orderCustomerId = order.customer._id?.toString() || order.customer.toString();
    const orderBranchId = order.branch?._id?.toString() || order.branch?.toString();
    const orderTailorId = order.assignedTailor?._id?.toString() || order.assignedTailor?.toString();
    if (req.user.role === "customer" && orderCustomerId !== req.user._id.toString()) {
        return next(new AppError(403, "You do not have permission to view this order"));
    }
    if (req.user.role === "branch-manager" && orderBranchId !== req.user.branch?.toString()) {
        return next(new AppError(403, "You do not have permission to view this order"));
    }
    if (req.user.role === "tailor" && orderTailorId !== req.user._id.toString()) {
        return next(new AppError(403, "You do not have permission to view this order"));
    }

    res.status(200).json({
        status: "success",
        data: {
            order,
        },
    });
};

// 4. Get All Orders (Admin & Tailor Dashboard)
exports.getAllOrders = async (req, res, next) => {
    let filter = {};

    // Tailors only see orders assigned to them
    if (req.user.role === "tailor") {
        filter = { assignedTailor: req.user._id };
    }

    const orders = await Order.find(filter).sort("-createdAt");

    res.status(200).json({
        status: "success",
        results: orders.length,
        data: {
            orders,
        },
    });
};

exports.getTailorOrders = async (req, res) => {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
    const filter = { assignedTailor: req.user._id };
    if (req.query.status && req.query.status !== "all") filter.status = String(req.query.status);
    if (req.query.search && String(req.query.search).trim()) {
        const text = String(req.query.search).trim();
        const safe = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const idSuffix = text.replace(/^#/, "");
        const [matchingGarments, matchingOrders] = await Promise.all([
            Garment.find({ name: { $regex: safe, $options: "i" } }).distinct("_id"),
            idSuffix ? Order.aggregate([
                { $match: { assignedTailor: req.user._id } },
                { $addFields: { searchableOrderId: { $toString: "$_id" } } },
                { $match: { searchableOrderId: { $regex: `${idSuffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } } },
                { $project: { _id: 1 } },
            ]) : Promise.resolve([]),
        ]);
        const matches = matchingOrders.length ? [{ _id: { $in: matchingOrders.map((order) => order._id) } }] : [];
        if (matchingGarments.length) matches.push({ "items.garment": { $in: matchingGarments } });
        filter.$or = matches.length ? matches : [{ _id: null }];
    }
    const [orders, total] = await Promise.all([
        Order.find(filter)
            .select("-deliveryAddress -payment -checkoutRequestId -sourceCartItemIds -items.measurementSnapshot -items.referenceImages -items.customizationNotes")
            .populate({ path: "customer", select: "name" })
            .sort("-createdAt").skip((page - 1) * limit).limit(limit).lean(),
        Order.countDocuments(filter),
    ]);
    res.status(200).json({ status: "success", results: total, page, pages: Math.ceil(total / limit), data: { orders } });
};

// 5. Update Order Status (Tailor / Admin)
exports.updateOrderStatus = async (req, res, next) => {
    const { status } = req.body;

    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) return next(new AppError(404, "No order found with that ID"));
    if (existingOrder.paymentStatus !== "paid") {
        return next(new AppError(409, "An order cannot enter tailoring before payment is confirmed."));
    }
    const assignedTailorId = existingOrder.assignedTailor?._id?.toString() || existingOrder.assignedTailor?.toString();
    if (req.user.role === "tailor" && assignedTailorId !== req.user._id.toString()) {
        return next(new AppError(403, "You can only update orders assigned to you."));
    }
    if (!canAdvanceOrder(existingOrder.status, status)) {
        return next(new AppError(409, `Order cannot move from ${existingOrder.status} to ${status}.`));
    }
    const tailorTransitions = {
        assigned_to_tailor: ["cutting"],
        cutting: ["stitching"],
        stitching: ["trial_ready"],
    };
    if (req.user.role === "tailor" && !tailorTransitions[existingOrder.status]?.includes(status)) {
        return next(new AppError(403, "Tailors can advance work through trial ready. A branch manager reviews and completes the order."));
    }
    const previousStatus = existingOrder.status;
    existingOrder.status = status;
    existingOrder.workflowHistory.push({ type: "status_changed", fromStatus: previousStatus, toStatus: status, actor: req.user._id });
    const order = await existingOrder.save();

    res.status(200).json({
        status: "success",
        data: {
            order,
        },
    });
};

// 6. Assign Tailor to Order (Admin Only)
exports.assignTailor = async (req, res, next) => {
    const { tailorId } = req.body;

    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) return next(new AppError(404, "No order found with that ID"));
    if (existingOrder.paymentStatus !== "paid") {
        return next(new AppError(409, "A tailor can only be assigned after payment is confirmed."));
    }
    if (existingOrder.status !== "order_placed") {
        return next(new AppError(409, "This order is not ready for tailor assignment."));
    }
    if (!mongoose.isValidObjectId(tailorId)) return next(new AppError(400, "Choose a valid tailor."));
    const tailor = await User.findOne({ _id: tailorId, role: "tailor" }).select("_id name branch");
    if (!tailor) return next(new AppError(400, "Choose an active tailor account."));
    const orderBranchId = existingOrder.branch?.toString();
    const tailorBranchId = tailor.branch?.toString();
    if (orderBranchId && orderBranchId !== tailorBranchId) {
        return next(new AppError(400, "The tailor must belong to the order's branch."));
    }
    if (!existingOrder.branch && tailor.branch) existingOrder.branch = tailor.branch;
    const previousStatus = existingOrder.status;
    existingOrder.assignedTailor = tailor._id;
    existingOrder.status = "assigned_to_tailor";
    existingOrder.workflowHistory.push({ type: "tailor_assigned", fromStatus: previousStatus, toStatus: existingOrder.status, actor: req.user._id, note: `Assigned to ${tailor.name}.` });
    const order = await existingOrder.save();

    res.status(200).json({
        status: "success",
        data: {
            order,
        },
    });
};
