const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const lowStock = require("./lowStock");
const stockAdjustment = require("./stockAdjustment");
const {
  STOCK_ADJUSTMENT_REASONS,
  STOCK_ADJUSTMENT_REASON_LABELS,
} = require("./stockAdjustmentReasons");

const handleServiceFailure = (res, result, fallbackMessage) =>
  response.errorResponse(
    res,
    result.errors || {},
    result.message || fallbackMessage,
    result.statusCode || 400,
  );

const listLowStock = async (req, res) => {
  try {
    const includeInactive =
      String(req.query.includeInactive || "").toLowerCase() === "true";
    const syncNotifications =
      String(req.query.syncNotifications || "true").toLowerCase() !== "false";

    const result = await lowStock.listLowStock({
      includeInactive,
      syncNotifications,
    });

    if (!result.ok) {
      return response.errorResponse(
        res,
        result.errors || {},
        result.message || "Unable to fetch low stock items.",
        result.statusCode || 400,
      );
    }

    return response.successResponse(
      res,
      {
        threshold: result.threshold,
        items: result.items,
        total: result.total,
        notificationSummary: result.notificationSummary,
      },
      "Low stock items fetched.",
    );
  } catch (err) {
    console.error("listLowStock:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const listStockAdjustmentReasons = async (req, res) => {
  try {
    const reasons = STOCK_ADJUSTMENT_REASONS.map((value) => ({
      value,
      label: STOCK_ADJUSTMENT_REASON_LABELS[value] || value,
    }));

    return response.successResponse(res, { reasons }, "Adjustment reasons fetched.");
  } catch (err) {
    console.error("listStockAdjustmentReasons:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const createStockAdjustment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await stockAdjustment.createStockAdjustment({
      variantId: req.body.variantId,
      size: req.body.size,
      delta: req.body.delta,
      reason: req.body.reason,
      adminId: req.user?.id,
    });

    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to adjust stock.");
    }

    return response.successResponse(
      res,
      {
        adjustment: result.adjustment,
        stock: result.stock,
      },
      "Stock adjusted.",
      201,
    );
  } catch (err) {
    console.error("createStockAdjustment:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const listStockAdjustments = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await stockAdjustment.listStockAdjustments(req.query);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to fetch stock adjustments.");
    }

    return response.successResponse(
      res,
      {
        adjustments: result.adjustments,
        pagination: result.pagination,
      },
      "Stock adjustments fetched.",
    );
  } catch (err) {
    console.error("listStockAdjustments:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

module.exports = {
  listLowStock,
  listStockAdjustmentReasons,
  createStockAdjustment,
  listStockAdjustments,
};
