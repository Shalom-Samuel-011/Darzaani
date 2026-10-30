const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const app = require("../app");

test("role-restricted API routes reject signed-in users from other roles", async () => {
    process.env.JWT_SECRET = "route-access-test-secret";
    const originalFindById = User.findById;
    const originalConsoleLog = console.log;
    console.log = () => {};
    User.findById = async (id) => ({
        _id: id,
        role: id === "test-tailor" ? "tailor" : "customer",
        changedPasswordAfter: () => false,
    });

    const server = app.listen(0, "127.0.0.1");
    try {
        await new Promise((resolve, reject) => {
            server.once("listening", resolve);
            server.once("error", reject);
        });
        const address = server.address();
        const baseUrl = `http://127.0.0.1:${address.port}`;
        const cases = [
            ["customer", "/api/v1/admin/stats", 403],
            ["customer", "/api/v1/manager/dashboard", 403],
            ["customer", "/api/v1/order/my-assigned", 403],
            ["test-tailor", "/api/v1/manager/dashboard", 403],
            [null, "/api/v1/admin/stats", 401],
        ];

        for (const [userId, route, expectedStatus] of cases) {
            const headers = userId
                ? { Authorization: `Bearer ${jwt.sign({ id: userId }, process.env.JWT_SECRET)}` }
                : {};
            const response = await fetch(`${baseUrl}${route}`, { headers });
            assert.equal(response.status, expectedStatus, `${userId || "anonymous"} -> ${route}`);
        }
    } finally {
        User.findById = originalFindById;
      console.log = originalConsoleLog;
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
});
