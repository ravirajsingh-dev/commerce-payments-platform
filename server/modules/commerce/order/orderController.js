const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const service = require("./orderService");
const cancelService = require("./orderCancelService");
const claimService = require("./orderClaimService");
const claimEvidenceService = require("./orderClaimEvidenceService");
const {
  getUserOrderInvoiceDownload,
} = require("./invoice/orderInvoiceDownloadService");

const resolveUserId = (req) => req.user?.id || req.userObj?._id?.toString();

const handleServiceFailure = (res, result, fallbackMessage) =>
  response.errorResponse(
    res,
    result.errors || {},
    result.message || fallbackMessage,
    result.statusCode || 400,
  );

const listUserOrders = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(
        res,
        {},
        "Authentication required.",
        401,
      );
    }

    const result = await service.listUserOrders(userId, req.query);
    return response.successResponse(
      res,
      {
        orders: result.orders,
        pagination: result.pagination,
      },
      "Orders fetched.",
    );
  } catch (err) {
    console.error("listUserOrders:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const getUserOrderByOrderNo = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(
        res,
        {},
        "Authentication required.",
        401,
      );
    }

    const result = await service.getUserOrderByOrderNo(userId, req.params.orderNo);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to fetch order.");
    }

    return response.successResponse(res, { order: result.order }, "Order fetched.");
  } catch (err) {
    console.error("getUserOrderByOrderNo:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const requestOrderCancellation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(
        res,
        {},
        "Authentication required.",
        401,
      );
    }

    const result = await cancelService.requestOrderCancellation(
      userId,
      req.params.orderNo,
      req.body,
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to request cancellation.");
    }

    return response.successResponse(
      res,
      { order: result.order },
      "Cancellation request submitted.",
    );
  } catch (err) {
    console.error("requestOrderCancellation:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const requestOrderClaim = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(
        res,
        {},
        "Authentication required.",
        401,
      );
    }

    const result = await claimService.createClaimRequest(
      userId,
      req.params.orderNo,
      req.body,
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to submit claim request.");
    }

    return response.successResponse(
      res,
      { claim: result.claim },
      "Claim request submitted.",
    );
  } catch (err) {
    console.error("requestOrderClaim:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const uploadClaimEvidence = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(
        res,
        {},
        "Authentication required.",
        401,
      );
    }

    const result = await claimEvidenceService.uploadClaimEvidenceFile(
      userId,
      req.params.orderNo,
      req.body?.category,
      req.file,
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to upload claim evidence.");
    }

    return response.successResponse(
      res,
      result.file,
      "Claim evidence uploaded.",
    );
  } catch (err) {
    console.error("uploadClaimEvidence:", err);
    return response.errorResponse(
      res,
      {},
      err.message || "Upload failed.",
      500,
    );
  }
};

const submitClaimReturnShipment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(
        res,
        {},
        "Authentication required.",
        401,
      );
    }

    const result = await claimService.submitClaimReturnShipment(
      userId,
      req.params.orderNo,
      req.body,
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to submit return shipment.");
    }

    const orderResult = await service.getUserOrderByOrderNo(userId, req.params.orderNo);
    return response.successResponse(
      res,
      { claim: result.claim, order: orderResult.ok ? orderResult.order : null },
      "Return shipment submitted.",
    );
  } catch (err) {
    console.error("submitClaimReturnShipment:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const getUserOrderInvoice = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(
        res,
        {},
        "Authentication required.",
        401,
      );
    }

    const result = await getUserOrderInvoiceDownload(userId, req.params.orderNo);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to download invoice.");
    }

    res.setHeader("Content-Type", result.contentType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.fileName || "invoice.pdf"}"`,
    );
    res.setHeader("Content-Length", String(result.pdfBuffer.length));
    return res.status(200).send(result.pdfBuffer);
  } catch (err) {
    console.error("getUserOrderInvoice:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

module.exports = {
  listUserOrders,
  getUserOrderByOrderNo,
  getUserOrderInvoice,
  requestOrderCancellation,
  requestOrderClaim,
  uploadClaimEvidence,
  submitClaimReturnShipment,
};
