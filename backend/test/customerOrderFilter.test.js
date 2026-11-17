const test = require("node:test");
const assert = require("node:assert/strict");
const Order = require("../models/ordersModel");
const { getMyOrders } = require("../controllers/ordersController");

function createResponse() {
    return {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
}

test("getMyOrders filters by customer and requested status", async () => {
    const originalFind = Order.find;
    const expectedOrders = [{ _id: "order-1", status: "delivered" }];
    let query;
    try {
        Order.find = (filter) => {
            query = filter;
            return { sort: async () => expectedOrders };
        };

        const response = createResponse();
        await getMyOrders(
            { user: { _id: "customer-1" }, query: { status: "delivered" } },
            response,
        );

        assert.deepEqual(query, {
            customer: "customer-1",
            status: "delivered",
        });
        assert.equal(response.statusCode, 200);
        assert.deepEqual(response.body.data.orders, expectedOrders);
    } finally {
        Order.find = originalFind;
    }
});

test("getMyOrders returns all customer orders when status is all", async () => {
    const originalFind = Order.find;
    let query;
    try {
        Order.find = (filter) => {
            query = filter;
            return { sort: async () => [] };
        };

        const response = createResponse();
        await getMyOrders(
            { user: { _id: "customer-1" }, query: { status: "all" } },
            response,
        );

        assert.deepEqual(query, { customer: "customer-1" });
        assert.equal(response.statusCode, 200);
    } finally {
        Order.find = originalFind;
    }
});
