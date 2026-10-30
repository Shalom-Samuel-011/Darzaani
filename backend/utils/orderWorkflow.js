const NEXT_ORDER_STATUSES = {
    order_placed: [],
    assigned_to_tailor: ["cutting"],
    cutting: ["stitching"],
    stitching: ["trial_ready"],
    trial_ready: ["stitching", "completed"],
    completed: ["dispatched"],
    dispatched: ["delivered"],
};

const canAdvanceOrder = (currentStatus, nextStatus) =>
    Boolean(NEXT_ORDER_STATUSES[currentStatus]?.includes(nextStatus));

module.exports = { NEXT_ORDER_STATUSES, canAdvanceOrder };
