const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const service = require("./orderAdminService");
const cancelService = require("./orderCancelService");
const addressSnapshotService = require("./orderAddressSnapshot");
const claimAdminService = require("./orderClaimAdminService");
const claimEvidenceService = require("./orderClaimEvidenceService");

const handleServiceFailure = (res, result, fallbackMessage) =>
  response.errorResponse(
    res,
    result.errors || {},
    result.message || fallbackMessage,
    result.statusCode || 400,
  );

const listAdminOrders = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.listAdminOrders(req.query);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to fetch orders.");
    }

    return response.successResponse(
      res,
      {
        orders: result.orders,
        pagination: result.pagination,
        summary: result.summary,
        pendingCancelRequestCount: result.pendingCancelRequestCount ?? 0,
        pendingClaimCount: result.pendingClaimCount ?? 0,
      },
      "Orders fetched.",
    );
  } catch (err) {
    console.error("listAdminOrders:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const listAdminClaims = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }
  try {
    const result = await claimAdminService.listClaimsForAdmin(req.query);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to fetch claims.");
    }
    return response.successResponse(
      res,
      { claims: result.claims, pagination: result.pagination },
      "Claims fetched.",
    );
  } catch (err) {
    console.error("listAdminClaims:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const getAdminClaimByOrderNo = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }
  try {
    const result = await claimAdminService.getClaimByOrderNoForAdmin(req.params.orderNo);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to fetch claim.");
    }
    return response.successResponse(
      res,
      { claim: result.claim, orderItems: result.orderItems || [] },
      "Claim fetched.",
    );
  } catch (err) {
    console.error("getAdminClaimByOrderNo:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const approveAdminClaim = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }
  try {
    const result = await claimAdminService.approveClaimForOrder(
      req.params.orderNo,
      req.body,
      { actorId: req.user?.id },
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to approve claim.");
    }
    return response.successResponse(res, { claim: result.claim }, "Claim approved.");
  } catch (err) {
    console.error("approveAdminClaim:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const rejectAdminClaim = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }
  try {
    const result = await claimAdminService.rejectClaimForOrder(
      req.params.orderNo,
      req.body,
      { actorId: req.user?.id },
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to reject claim.");
    }
    return response.successResponse(res, { claim: result.claim }, "Claim rejected.");
  } catch (err) {
    console.error("rejectAdminClaim:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const patchAdminClaim = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }
  try {
    const result = await claimAdminService.patchClaimForOrder(
      req.params.orderNo,
      req.body,
      { actorId: req.user?.id },
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to update claim.");
    }
    return response.successResponse(res, { claim: result.claim }, "Claim updated.");
  } catch (err) {
    console.error("patchAdminClaim:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const createAdminClaimRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }
  try {
    const result = await claimAdminService.createClaimRequestAsAdmin(
      req.params.orderNo,
      req.body,
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to create claim request.");
    }
    return response.successResponse(res, { claim: result.claim }, "Claim request created.");
  } catch (err) {
    console.error("createAdminClaimRequest:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const completeAdminClaim = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }
  try {
    const result = await claimAdminService.completeClaimForOrder(
      req.params.orderNo,
      req.body,
      { actorId: req.user?.id },
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to complete claim.");
    }
    return response.successResponse(res, { claim: result.claim }, "Claim completed.");
  } catch (err) {
    console.error("completeAdminClaim:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const getAdminOrderByOrderNo = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.getAdminOrderByOrderNo(req.params.orderNo);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to fetch order.");
    }

    return response.successResponse(res, { order: result.order }, "Order fetched.");
  } catch (err) {
    console.error("getAdminOrderByOrderNo:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const updateAdminOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.updateAdminOrder(req.params.orderNo, req.body, {
      actorId: req.user?.id,
    });
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to update order.");
    }

    return response.successResponse(res, { order: result.order }, "Order updated.");
  } catch (err) {
    console.error("updateAdminOrder:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const cancelAdminOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await cancelService.cancelOrderAsAdmin(
      req.params.orderNo,
      req.body,
      { actorId: req.user?.id },
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to cancel order.");
    }

    return response.successResponse(
      res,
      { order: result.order },
      "Order cancelled and stock restored.",
    );
  } catch (err) {
    console.error("cancelAdminOrder:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const patchAdminOrderAddressSnapshot = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await addressSnapshotService.patchAdminOrderAddressSnapshot(
      req.params.orderNo,
      req.body,
      { actorId: req.user?.id },
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to update shipping address.");
    }

    return response.successResponse(
      res,
      { order: result.order },
      "Shipping address updated.",
    );
  } catch (err) {
    console.error("patchAdminOrderAddressSnapshot:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const getAdminClaimCatalog = async (req, res) => {
  try {
    const result = claimAdminService.getClaimCatalogForAdmin();
    return response.successResponse(res, result.catalog, "Claim catalog fetched.");
  } catch (err) {
    console.error("getAdminClaimCatalog:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const uploadAdminClaimEvidence = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await claimEvidenceService.uploadClaimEvidenceFileForAdmin(
      req.params.orderNo,
      req.body.category,
      req.file,
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to upload claim evidence.");
    }
    return response.successResponse(res, result.file, "Evidence uploaded.");
  } catch (err) {
    console.error("uploadAdminClaimEvidence:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

module.exports = {
  listAdminOrders,
  getAdminOrderByOrderNo,
  updateAdminOrder,
  cancelAdminOrder,
  patchAdminOrderAddressSnapshot,
  listAdminClaims,
  getAdminClaimByOrderNo,
  createAdminClaimRequest,
  approveAdminClaim,
  rejectAdminClaim,
  patchAdminClaim,
  completeAdminClaim,
  uploadAdminClaimEvidence,
  getAdminClaimCatalog,
};
