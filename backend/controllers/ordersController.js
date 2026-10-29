const crypto = require("crypto");
const Order = require("../models/ordersModel");
const User = require("../models/userModel");
const Garment = require("../models/garmentsModel");
const PaymentWebhookEvent = require("../models/paymentWebhookEventModel");
const AppError = require("../utils/appError");

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
            fabricSource: "provided_by_boutique",
            itemPrice: unitAmount / 100,
            quantity: cartItem.quantity,
        });
    }
    return { items, amountInPaise };
};

// Create the local order and Razorpay order from trusted server-side cart data.
exports.createCheckout = async (req, res) => {
    const { keyId } = getRazorpayCredentials();
    const { requestId } = req.body;
    if (typeof requestId !== "string" || !/^[\da-f-]{36}$/i.test(requestId)) {
        throw new AppError(400, "Invalid checkout request. Please try again.");
    }
    const deliveryAddress = validateDeliveryAddress(req.body.deliveryAddress);

    let order = await Order.findOne({
        customer: req.user._id,
        checkoutRequestId: requestId,
    });
    if (order?.paymentStatus === "paid") {
        throw new AppError(409, "This checkout has already been paid.");
    }
    if (order?.payment?.razorpayOrderId) {
        return res.status(200).json({
            status: "success",
            data: { checkout: makeCheckoutResponse(order, keyId) },
        });
    }

    if (!order) {
        const { items, amountInPaise } = await buildOrderItemsFromCart(req.user);
        order = new Order({
            customer: req.user._id,
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
                status: order.fabricPickupRequired ? "awaiting_fabric" : "order_placed",
                "payment.razorpayPaymentId": payment.id,
                "payment.verifiedAt": new Date(),
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
    const order = await Order.findById(req.params.id);

    if (!order) {
        return next(new Error("No order found with that ID"));
    }

    // Access Control: Customers can only access their own orders
    if (
        req.user.role === "customer" &&
        order.customer._id.toString() !== req.user._id.toString()
    ) {
        return next(new Error("You do not have permission to view this order"));
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

// 5. Update Order Status (Tailor / Admin)
exports.updateOrderStatus = async (req, res, next) => {
    const { status } = req.body;

    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) return next(new Error("No order found with that ID"));
    if (existingOrder.paymentStatus !== "paid") {
        return next(new AppError(409, "An order cannot enter tailoring before payment is confirmed."));
    }

    const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true },
    );

    if (!order) {
        return next(new Error("No order found with that ID"));
    }

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
    if (!existingOrder) return next(new Error("No order found with that ID"));
    if (existingOrder.paymentStatus !== "paid") {
        return next(new AppError(409, "A tailor can only be assigned after payment is confirmed."));
    }

    const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
            assignedTailor: tailorId,
            status: "assigned_to_tailor",
        },
        { new: true, runValidators: true },
    );

    if (!order) {
        return next(new Error("No order found with that ID"));
    }

    res.status(200).json({
        status: "success",
        data: {
            order,
        },
    });
};
