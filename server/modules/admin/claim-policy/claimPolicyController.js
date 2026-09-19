const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const service = require("./claimPolicyService");

const listClaimPolicies = async (_req, res) => {
  try {
    const result = await service.listClaimPolicies(_req.query || {});
    return response.successResponse(res, result, "Claim policies fetched.");
  } catch (err) {
    console.error("listClaimPolicies:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const createClaimPolicy = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const created = await service.createClaimPolicy(req.body || {});
    return response.successResponse(res, created, "Claim policy created.");
  } catch (err) {
    if (err?.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "code", msg: "Claim policy code already exists." }],
        "Validation Error",
        400,
      );
    }
    console.error("createClaimPolicy:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const getClaimPolicyById = async (req, res) => {
  try {
    const row = await service.getClaimPolicyById(req.params.id);
    if (!row) {
      return response.errorResponse(res, [{ msg: "Claim policy not found." }], "Not found", 404);
    }
    return response.successResponse(res, row, "Claim policy fetched.");
  } catch (err) {
    console.error("getClaimPolicyById:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const updateClaimPolicy = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }
  try {
    const updated = await service.updateClaimPolicy(req.params.id, req.body || {});
    if (!updated) {
      return response.errorResponse(res, [{ msg: "Claim policy not found." }], "Not found", 404);
    }
    return response.successResponse(res, updated, "Claim policy updated.");
  } catch (err) {
    if (err?.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "code", msg: "Claim policy code already exists." }],
        "Validation Error",
        400,
      );
    }
    console.error("updateClaimPolicy:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const setClaimPolicyStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }
  try {
    const updated = await service.setClaimPolicyStatus(
      req.params.id,
      req.body?.isActive === true,
    );
    if (!updated) {
      return response.errorResponse(res, [{ msg: "Claim policy not found." }], "Not found", 404);
    }
    return response.successResponse(res, updated, "Claim policy status updated.");
  } catch (err) {
    console.error("setClaimPolicyStatus:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const deleteClaimPolicy = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }
  try {
    const deleted = await service.deleteClaimPolicy(req.params.id);
    if (!deleted) {
      return response.errorResponse(res, [{ msg: "Claim policy not found." }], "Not found", 404);
    }
    return response.successResponse(res, deleted, "Claim policy deleted.");
  } catch (err) {
    console.error("deleteClaimPolicy:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

module.exports = {
  listClaimPolicies,
  createClaimPolicy,
  getClaimPolicyById,
  updateClaimPolicy,
  setClaimPolicyStatus,
  deleteClaimPolicy,
};
