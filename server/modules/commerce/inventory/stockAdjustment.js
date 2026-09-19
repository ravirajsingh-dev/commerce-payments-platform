const mongoose = require("mongoose");
const StockAdjustment = require("../../../models/StockAdjustment");
const ProductVariant = require("../../../models/ProductVariant");
const Admin = require("../../../models/Admin");
const inventoryService = require("./inventoryService");
const { INVENTORY_ERROR } = require("./inventoryService");
const { STOCK_ADJUSTMENT_REASONS } = require("./stockAdjustmentReasons");

const isTransactionNotSupported = (err) => {
  const msg = String(err?.message || "").toLowerCase();
  return (
    err?.code === 20 ||
    msg.includes("replica set") ||
    msg.includes("mongos") ||
    msg.includes("transaction numbers are only allowed")
  );
};

const STOCK_ADJUSTMENT_ERROR = {
  INVALID_VARIANT_ID: "INVALID_VARIANT_ID",
  INVALID_ADMIN_ID: "INVALID_ADMIN_ID",
  INVALID_REASON: "INVALID_REASON",
  INVALID_DELTA: "INVALID_DELTA",
  VARIANT_NOT_FOUND: "VARIANT_NOT_FOUND",
};

const normalizeSize = (size) => {
  if (size === undefined || size === null) return "";
  return String(size).trim().toLowerCase();
};

const mapInventoryError = (err) => {
  const code = err?.code;
  if (!code || !Object.values(INVENTORY_ERROR).includes(code)) {
    return null;
  }

  const meta = err.meta || {};
  const base = { path: "delta", msg: err.message };

  switch (code) {
    case INVENTORY_ERROR.INVALID_VARIANT_ID:
      return {
        ok: false,
        statusCode: 400,
        message: err.message,
        errors: [{ path: "variantId", msg: "Invalid product variant id." }],
      };
    case INVENTORY_ERROR.VARIANT_NOT_FOUND:
      return {
        ok: false,
        statusCode: 404,
        message: "Product variant not found",
        errors: [{ path: "variantId", msg: "Product variant not found." }],
      };
    case INVENTORY_ERROR.SIZE_REQUIRED:
      return {
        ok: false,
        statusCode: 400,
        message: err.message,
        errors: [{ path: "size", msg: "Size is required for this variant." }],
      };
    case INVENTORY_ERROR.SIZE_NOT_ALLOWED:
      return {
        ok: false,
        statusCode: 400,
        message: err.message,
        errors: [{ path: "size", msg: "This variant does not use per-size stock." }],
      };
    case INVENTORY_ERROR.SIZE_NOT_FOUND:
      return {
        ok: false,
        statusCode: 400,
        message: err.message,
        errors: [{ path: "size", msg: "Size not found for this variant." }],
      };
    case INVENTORY_ERROR.INVALID_DELTA:
    case INVENTORY_ERROR.INVALID_QUANTITY:
      return {
        ok: false,
        statusCode: 400,
        message: err.message,
        errors: [{ path: "delta", msg: err.message }],
      };
    case INVENTORY_ERROR.INSUFFICIENT_STOCK:
      return {
        ok: false,
        statusCode: 409,
        message: "Insufficient stock for this adjustment",
        errors: [
          {
            path: "delta",
            msg: `Only ${meta.available ?? 0} unit(s) available.`,
          },
        ],
      };
    default:
      return {
        ok: false,
        statusCode: 400,
        message: err.message,
        errors: [base],
      };
  }
};

const serializeStockAdjustment = (row, adminById = new Map()) => {
  const adminId = row.adminId ? String(row.adminId) : null;
  const admin = adminId ? adminById.get(adminId) : null;

  return {
    id: String(row._id),
    variantId: String(row.variantId),
    sku: row.sku || "",
    size: row.size || "",
    delta: row.delta,
    reason: row.reason,
    stockBefore: row.stockBefore,
    stockAfter: row.stockAfter,
    adminId,
    adminName: admin?.name || admin?.email || "Admin",
    createdAt: row.createdAt,
  };
};

const loadAdminsById = async (adminIds) => {
  const uniqueIds = [
    ...new Set(adminIds.filter((id) => mongoose.Types.ObjectId.isValid(id))),
  ];
  if (!uniqueIds.length) {
    return new Map();
  }

  const admins = await Admin.find({ _id: { $in: uniqueIds } })
    .select("name email")
    .lean();

  return new Map(admins.map((row) => [String(row._id), row]));
};

const createStockAdjustment = async ({
  variantId,
  size = null,
  delta,
  reason,
  adminId,
}) => {
  if (!mongoose.Types.ObjectId.isValid(variantId)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid product variant id",
      errors: [{ path: "variantId", msg: "Invalid product variant id." }],
    };
  }

  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid admin id",
      errors: [{ path: "adminId", msg: "Invalid admin id." }],
    };
  }

  const normalizedReason = String(reason || "").trim().toLowerCase();
  if (!STOCK_ADJUSTMENT_REASONS.includes(normalizedReason)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid adjustment reason",
      errors: [{ path: "reason", msg: "Invalid adjustment reason." }],
    };
  }

  const parsedDelta = Number(delta);
  if (!Number.isFinite(parsedDelta) || parsedDelta === 0 || !Number.isInteger(parsedDelta)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Delta must be a non-zero integer",
      errors: [{ path: "delta", msg: "Delta must be a non-zero integer." }],
    };
  }

  const variant = await ProductVariant.findById(variantId).select("sku").lean();
  if (!variant) {
    return {
      ok: false,
      statusCode: 404,
      message: "Product variant not found",
      errors: [{ path: "variantId", msg: "Product variant not found." }],
    };
  }

  const normalizedSize = normalizeSize(size);
  const session = await mongoose.startSession();

  const runAdjustment = async (activeSession) => {
    const stockResult = await inventoryService.adjustStock(variantId, {
      size: normalizedSize || null,
      delta: parsedDelta,
      session: activeSession,
    });

    const created = await StockAdjustment.create(
      [
        {
          variantId,
          size: stockResult.size || normalizedSize || "",
          delta: parsedDelta,
          reason: normalizedReason,
          adminId,
          stockBefore: stockResult.stockBefore,
          stockAfter: stockResult.stockAfter,
          sku: variant.sku || "",
        },
      ],
      activeSession ? { session: activeSession } : {},
    );

    return { adjustmentDoc: created[0], stockResult };
  };

  try {
    let adjustmentDoc = null;
    let stockResult = null;

    try {
      await session.withTransaction(async () => {
        const result = await runAdjustment(session);
        adjustmentDoc = result.adjustmentDoc;
        stockResult = result.stockResult;
      });
    } catch (txErr) {
      if (!isTransactionNotSupported(txErr)) {
        throw txErr;
      }
      const result = await runAdjustment(null);
      adjustmentDoc = result.adjustmentDoc;
      stockResult = result.stockResult;
    }

    const adminById = await loadAdminsById([adminId]);
    return {
      ok: true,
      adjustment: serializeStockAdjustment(adjustmentDoc, adminById),
      stock: stockResult,
    };
  } catch (err) {
    const mapped = mapInventoryError(err);
    if (mapped) {
      return mapped;
    }
    throw err;
  } finally {
    session.endSession();
  }
};

const listStockAdjustments = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.variantId && mongoose.Types.ObjectId.isValid(query.variantId)) {
    filter.variantId = query.variantId;
  }

  const sku = String(query.sku || "")
    .trim()
    .toUpperCase();
  if (sku) {
    filter.sku = sku;
  }

  const reason = String(query.reason || "")
    .trim()
    .toLowerCase();
  if (reason && STOCK_ADJUSTMENT_REASONS.includes(reason)) {
    filter.reason = reason;
  }

  if (query.adminId && mongoose.Types.ObjectId.isValid(query.adminId)) {
    filter.adminId = query.adminId;
  }

  const [rows, total] = await Promise.all([
    StockAdjustment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    StockAdjustment.countDocuments(filter),
  ]);

  const adminById = await loadAdminsById(rows.map((row) => row.adminId));

  return {
    ok: true,
    adjustments: rows.map((row) => serializeStockAdjustment(row, adminById)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

module.exports = {
  STOCK_ADJUSTMENT_ERROR,
  createStockAdjustment,
  listStockAdjustments,
};
