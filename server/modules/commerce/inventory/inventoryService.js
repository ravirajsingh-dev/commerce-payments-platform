const mongoose = require("mongoose");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");

const INVENTORY_ERROR = {
  INVALID_VARIANT_ID: "INVALID_VARIANT_ID",
  VARIANT_NOT_FOUND: "VARIANT_NOT_FOUND",
  SIZE_REQUIRED: "SIZE_REQUIRED",
  SIZE_NOT_ALLOWED: "SIZE_NOT_ALLOWED",
  SIZE_NOT_FOUND: "SIZE_NOT_FOUND",
  INVALID_QUANTITY: "INVALID_QUANTITY",
  INVALID_DELTA: "INVALID_DELTA",
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
};

const createInventoryError = (code, message, meta = {}) => {
  const err = new Error(message);
  err.code = code;
  err.meta = meta;
  return err;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const normalizeSize = (size) => {
  if (size === undefined || size === null) return "";
  return String(size).trim().toLowerCase();
};

const normalizeQty = (qty) => {
  const parsed = Number(qty);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
};

const normalizeSignedDelta = (delta) => {
  const parsed = Number(delta);
  if (!Number.isFinite(parsed) || parsed === 0 || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
};

const variantUsesSizedStock = (variant) =>
  Array.isArray(variant?.sizes) && variant.sizes.length > 0;

const findSizeRow = (variant, sizeValue) => {
  const normalized = normalizeSize(sizeValue);
  if (!normalized) return null;
  return (variant.sizes || []).find(
    (row) => normalizeSize(row?.value) === normalized,
  );
};

const readLegacyStock = async (variantId, session = null) => {
  let query = Inventory.findOne({ productVariantId: variantId })
    .select("stock")
    .lean();
  if (session) query = query.session(session);
  const row = await query;
  return Math.max(0, Number(row?.stock) || 0);
};

const loadVariant = async (variantId, session = null) => {
  if (!isValidObjectId(variantId)) {
    throw createInventoryError(
      INVENTORY_ERROR.INVALID_VARIANT_ID,
      "Invalid product variant id",
      { variantId },
    );
  }

  const objectId = toObjectId(variantId);
  let query = ProductVariant.findById(objectId).select("sizes").lean();
  if (session) query = query.session(session);
  const variant = await query;

  if (!variant) {
    throw createInventoryError(
      INVENTORY_ERROR.VARIANT_NOT_FOUND,
      "Product variant not found",
      { variantId: String(variantId) },
    );
  }

  return { variant, objectId };
};

/**
 * Returns available units for a variant. Sized variants require `size` (normalized value).
 * Legacy variants (no `sizes` rows) read from the `Inventory` collection.
 */
const getAvailableStock = async (variantId, size = null, options = {}) => {
  const { session = null } = options;
  const { variant } = await loadVariant(variantId, session);
  const normalizedSize = normalizeSize(size);

  if (variantUsesSizedStock(variant)) {
    if (!normalizedSize) {
      throw createInventoryError(
        INVENTORY_ERROR.SIZE_REQUIRED,
        "Size is required for this variant",
        { variantId: String(variantId) },
      );
    }

    const row = findSizeRow(variant, normalizedSize);
    if (!row) {
      throw createInventoryError(
        INVENTORY_ERROR.SIZE_NOT_FOUND,
        "Size not found for this variant",
        { variantId: String(variantId), size: normalizedSize },
      );
    }

    return {
      variantId: String(variantId),
      mode: "sized",
      size: normalizedSize,
      available: Math.max(0, Number(row.stock) || 0),
    };
  }

  if (normalizedSize) {
    throw createInventoryError(
      INVENTORY_ERROR.SIZE_NOT_ALLOWED,
      "This variant does not use per-size stock",
      { variantId: String(variantId), size: normalizedSize },
    );
  }

  const available = await readLegacyStock(toObjectId(variantId), session);
  return {
    variantId: String(variantId),
    mode: "legacy",
    size: null,
    available,
  };
};

const decrementSizedStock = async (objectId, normalizedSize, qty, session) => {
  const update = ProductVariant.findOneAndUpdate(
    {
      _id: objectId,
      sizes: {
        $elemMatch: { value: normalizedSize, stock: { $gte: qty } },
      },
    },
    { $inc: { "sizes.$.stock": -qty } },
    { returnDocument: "after", session },
  ).select("sizes");

  const updated = await update;
  if (!updated) {
    const { variant } = await loadVariant(objectId, session);
    const row = findSizeRow(variant, normalizedSize);
    if (!row) {
      throw createInventoryError(
        INVENTORY_ERROR.SIZE_NOT_FOUND,
        "Size not found for this variant",
        { variantId: String(objectId), size: normalizedSize },
      );
    }
    throw createInventoryError(
      INVENTORY_ERROR.INSUFFICIENT_STOCK,
      "Insufficient stock",
      {
        variantId: String(objectId),
        size: normalizedSize,
        requested: qty,
        available: Math.max(0, Number(row.stock) || 0),
      },
    );
  }

  const row = findSizeRow(updated, normalizedSize);
  return Math.max(0, Number(row?.stock) || 0);
};

const decrementLegacyStock = async (objectId, qty, session) => {
  const update = Inventory.findOneAndUpdate(
    { productVariantId: objectId, stock: { $gte: qty } },
    { $inc: { stock: -qty } },
    { returnDocument: "after", session },
  ).select("stock");

  const updated = await update;
  if (!updated) {
    const available = await readLegacyStock(objectId, session);
    throw createInventoryError(
      INVENTORY_ERROR.INSUFFICIENT_STOCK,
      "Insufficient stock",
      {
        variantId: String(objectId),
        requested: qty,
        available,
      },
    );
  }

  return Math.max(0, Number(updated.stock) || 0);
};

/**
 * Atomically decrements stock. Uses per-size rows when present, else legacy `Inventory`.
 */
const decrementStock = async (variantId, options = {}) => {
  const { size = null, qty = 1, session = null } = options;
  const normalizedQty = normalizeQty(qty);
  if (!normalizedQty) {
    throw createInventoryError(
      INVENTORY_ERROR.INVALID_QUANTITY,
      "Quantity must be a positive integer",
      { qty },
    );
  }

  const { variant, objectId } = await loadVariant(variantId, session);
  const normalizedSize = normalizeSize(size);

  if (variantUsesSizedStock(variant)) {
    if (!normalizedSize) {
      throw createInventoryError(
        INVENTORY_ERROR.SIZE_REQUIRED,
        "Size is required for this variant",
        { variantId: String(variantId) },
      );
    }
    if (!findSizeRow(variant, normalizedSize)) {
      throw createInventoryError(
        INVENTORY_ERROR.SIZE_NOT_FOUND,
        "Size not found for this variant",
        { variantId: String(variantId), size: normalizedSize },
      );
    }

    const available = await decrementSizedStock(
      objectId,
      normalizedSize,
      normalizedQty,
      session,
    );
    return {
      variantId: String(variantId),
      mode: "sized",
      size: normalizedSize,
      available,
      decremented: normalizedQty,
    };
  }

  if (normalizedSize) {
    throw createInventoryError(
      INVENTORY_ERROR.SIZE_NOT_ALLOWED,
      "This variant does not use per-size stock",
      { variantId: String(variantId), size: normalizedSize },
    );
  }

  const available = await decrementLegacyStock(objectId, normalizedQty, session);
  return {
    variantId: String(variantId),
    mode: "legacy",
    size: null,
    available,
    decremented: normalizedQty,
  };
};

const releaseSizedStock = async (objectId, normalizedSize, qty, session) => {
  const update = ProductVariant.findOneAndUpdate(
    {
      _id: objectId,
      "sizes.value": normalizedSize,
    },
    { $inc: { "sizes.$.stock": qty } },
    { returnDocument: "after", session },
  ).select("sizes");

  const updated = await update;
  if (!updated) {
    throw createInventoryError(
      INVENTORY_ERROR.SIZE_NOT_FOUND,
      "Size not found for this variant",
      { variantId: String(objectId), size: normalizedSize },
    );
  }

  const row = findSizeRow(updated, normalizedSize);
  return Math.max(0, Number(row?.stock) || 0);
};

const releaseLegacyStock = async (objectId, qty, session) => {
  const update = Inventory.findOneAndUpdate(
    { productVariantId: objectId },
    { $inc: { stock: qty } },
    { returnDocument: "after", upsert: true, session, runValidators: true },
  ).select("stock");

  const updated = await update;
  return Math.max(0, Number(updated?.stock) || 0);
};

/**
 * Restores stock after cancel / failed checkout (inverse of decrementStock).
 */
const releaseStock = async (variantId, options = {}) => {
  const { size = null, qty = 1, session = null } = options;
  const normalizedQty = normalizeQty(qty);
  if (!normalizedQty) {
    throw createInventoryError(
      INVENTORY_ERROR.INVALID_QUANTITY,
      "Quantity must be a positive integer",
      { qty },
    );
  }

  const { variant, objectId } = await loadVariant(variantId, session);
  const normalizedSize = normalizeSize(size);

  if (variantUsesSizedStock(variant)) {
    if (!normalizedSize) {
      throw createInventoryError(
        INVENTORY_ERROR.SIZE_REQUIRED,
        "Size is required for this variant",
        { variantId: String(variantId) },
      );
    }
    if (!findSizeRow(variant, normalizedSize)) {
      throw createInventoryError(
        INVENTORY_ERROR.SIZE_NOT_FOUND,
        "Size not found for this variant",
        { variantId: String(variantId), size: normalizedSize },
      );
    }

    const available = await releaseSizedStock(
      objectId,
      normalizedSize,
      normalizedQty,
      session,
    );
    return {
      variantId: String(variantId),
      mode: "sized",
      size: normalizedSize,
      available,
      released: normalizedQty,
    };
  }

  if (normalizedSize) {
    throw createInventoryError(
      INVENTORY_ERROR.SIZE_NOT_ALLOWED,
      "This variant does not use per-size stock",
      { variantId: String(variantId), size: normalizedSize },
    );
  }

  const available = await releaseLegacyStock(objectId, normalizedQty, session);
  return {
    variantId: String(variantId),
    mode: "legacy",
    size: null,
    available,
    released: normalizedQty,
  };
};

/**
 * Applies a signed stock change. Positive delta adds stock; negative delta removes it.
 * All writes go through the same atomic paths as checkout/cancel.
 */
const adjustStock = async (variantId, options = {}) => {
  const { size = null, delta, session = null } = options;
  const normalizedDelta = normalizeSignedDelta(delta);
  if (!normalizedDelta) {
    throw createInventoryError(
      INVENTORY_ERROR.INVALID_DELTA,
      "Delta must be a non-zero integer",
      { delta },
    );
  }

  const before = await getAvailableStock(variantId, size, { session });
  const stockBefore = before.available;

  if (normalizedDelta > 0) {
    const result = await releaseStock(variantId, {
      size,
      qty: normalizedDelta,
      session,
    });
    return {
      variantId: result.variantId,
      mode: result.mode,
      size: result.size,
      delta: normalizedDelta,
      stockBefore,
      stockAfter: result.available,
    };
  }

  const result = await decrementStock(variantId, {
    size,
    qty: Math.abs(normalizedDelta),
    session,
  });
  return {
    variantId: result.variantId,
    mode: result.mode,
    size: result.size,
    delta: normalizedDelta,
    stockBefore,
    stockAfter: result.available,
  };
};

module.exports = {
  INVENTORY_ERROR,
  createInventoryError,
  getAvailableStock,
  decrementStock,
  releaseStock,
  adjustStock,
};
