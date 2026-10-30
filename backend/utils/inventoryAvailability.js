const canBranchFulfillCart = (garmentIds, garmentById, branchId) => garmentIds.every((id) => {
    const garment = garmentById.get(id);
    if (!garment || !garment.isAvailable) return false;
    const override = (garment.branchAvailability || []).find((entry) => entry.branch.toString() === branchId.toString());
    return override ? override.isAvailable : garment.isAvailable;
});

const findFirstAvailableBranch = (branches, garmentIds, garmentById) =>
    branches.find((branch) => canBranchFulfillCart(garmentIds, garmentById, branch._id)) || null;

module.exports = { canBranchFulfillCart, findFirstAvailableBranch };
