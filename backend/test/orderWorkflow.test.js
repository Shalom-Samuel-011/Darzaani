const test = require("node:test");
const assert = require("node:assert/strict");
const { canAdvanceOrder } = require("../utils/orderWorkflow");

test("production advances through tailoring, review, and delivery in order", () => {
    const transitions = [
        ["assigned_to_tailor", "cutting"],
        ["cutting", "stitching"],
        ["stitching", "trial_ready"],
        ["trial_ready", "completed"],
        ["completed", "dispatched"],
        ["dispatched", "delivered"],
    ];

    for (const [from, to] of transitions) assert.equal(canAdvanceOrder(from, to), true, `${from} -> ${to}`);
});

test("only the manager review step can return a trial-ready order to stitching", () => {
    assert.equal(canAdvanceOrder("trial_ready", "stitching"), true);
    assert.equal(canAdvanceOrder("stitching", "assigned_to_tailor"), false);
    assert.equal(canAdvanceOrder("order_placed", "cutting"), false);
    assert.equal(canAdvanceOrder("delivered", "dispatched"), false);
});
