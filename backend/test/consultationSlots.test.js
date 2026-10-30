const test = require("node:test");
const assert = require("node:assert/strict");
const slots = require("../utils/consultationSlots");

test("consultations cover opening hours and omit the 1 PM lunch hour", () => {
    assert.equal(slots[0].key, "09:00");
    assert.equal(slots.at(-1).key, "19:00");
    assert.equal(slots.length, 10);
    assert.equal(slots.some((slot) => slot.key === "13:00"), false);
    assert.equal(new Set(slots.map((slot) => slot.key)).size, slots.length);
});
