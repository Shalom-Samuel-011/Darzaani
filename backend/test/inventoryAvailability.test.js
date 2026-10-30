const test = require("node:test");
const assert = require("node:assert/strict");
const { canBranchFulfillCart, findFirstAvailableBranch } = require("../utils/inventoryAvailability");

test("checkout picks the nearest branch that has every cart item", () => {
    const branches = [{ _id: "near" }, { _id: "next" }, { _id: "far" }];
    const garmentById = new Map([
        ["dress-a", { isAvailable: true, branchAvailability: [{ branch: "near", isAvailable: true }, { branch: "next", isAvailable: true }] }],
        ["dress-b", { isAvailable: true, branchAvailability: [{ branch: "near", isAvailable: false }, { branch: "next", isAvailable: true }] }],
    ]);

    assert.equal(findFirstAvailableBranch(branches, ["dress-a", "dress-b"], garmentById), branches[1]);
});

test("global and branch availability both constrain checkout", () => {
    const garmentById = new Map([
        ["global-off", { isAvailable: false, branchAvailability: [{ branch: "branch-a", isAvailable: true }] }],
        ["branch-off", { isAvailable: true, branchAvailability: [{ branch: "branch-a", isAvailable: false }] }],
        ["default-on", { isAvailable: true, branchAvailability: [] }],
    ]);

    assert.equal(canBranchFulfillCart(["global-off"], garmentById, "branch-a"), false);
    assert.equal(canBranchFulfillCart(["branch-off"], garmentById, "branch-a"), false);
    assert.equal(canBranchFulfillCart(["default-on"], garmentById, "branch-a"), true);
    assert.equal(canBranchFulfillCart(["missing"], garmentById, "branch-a"), false);
});

test("a branch must cover all items in the fitting bag", () => {
    const garmentById = new Map([
        ["dress-a", { isAvailable: true, branchAvailability: [{ branch: "branch-a", isAvailable: true }] }],
        ["dress-b", { isAvailable: true, branchAvailability: [{ branch: "branch-a", isAvailable: false }, { branch: "branch-b", isAvailable: true }] }],
    ]);

    assert.equal(canBranchFulfillCart(["dress-a", "dress-b"], garmentById, "branch-a"), false);
});
