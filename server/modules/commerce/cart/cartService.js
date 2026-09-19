const mongoose = require("mongoose");
const Cart = require("../../../models/Cart");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const { getVariantEffectivePrice } = require("../../../utils/variantPricing");
const {
  getAvailableStock,
  INVENTORY_ERROR,
} = require("../inventory/inventoryService");

const ACTIVE_STATUS = 1;

const CART_ERROR = {
  INVALID_VARIANT_ID: "INVALID_VARIANT_ID",
  VARIANT_NOT_AVAILABLE: "VARIANT_NOT_AVAILABLE",
  INVALID_QUANTITY: "INVALID_QUANTITY",
  ITEM_NOT_FOUND: "ITEM_NOT_FOUND",
  CART_NOT_FOUND: "CART_NOT_FOUND",
};

const CART_ITEM_ISSUE = {
  UNAVAILABLE: "UNAVAILABLE",
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
  PRICE_CHANGED: "PRICE_CHANGED",
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

const attributesToObject = (attrs) => {
  if (attrs == null) return {};
  if (attrs instanceof Map) {
    return Object.fromEntries(attrs.entries());
  }
  if (typeof attrs === "object") {
    return Object.fromEntries(
      Object.entries(attrs).map(([k, v]) => [String(k), String(v ?? "")]),
    );
  }
  return {};
};

const findItemIndex = (items, variantId, size) => {
  const normalizedSize = normalizeSize(size);
  return items.findIndex(
    (item) =>
      String(item.productVariantId) === String(variantId) &&
      normalizeSize(item.size) === normalizedSize,
  );
};

const { normalizeOwner, isValidGuestOwner, isValidUserOwner } = require("./cartOwner");

const emptyCartResponse = (ownerOrUserId) => {
  const owner = normalizeOwner(ownerOrUserId);
  const isGuest = owner.type === "guest";
  return {
    id: null,
    userId: isGuest ? null : String(owner.userId),
    sessionId: isGuest ? owner.sessionId || null : null,
    isGuest,
    items: [],
    itemCount: 0,
    subtotal: 0,
    subtotalAtCurrentPrices: 0,
    hasIssues: false,
    couponCode: "",
    updatedAt: null,
  };
};

const isVariantPurchasable = (variant, productStatusById) => {
  if (!variant || Number(variant.status) !== ACTIVE_STATUS) {
    return false;
  }
  const productStatus = productStatusById.get(String(variant.productId));
  return Number(productStatus) === ACTIVE_STATUS;
};

const readAvailableStock = async (variantId, size) => {
  try {
    const stock = await getAvailableStock(
      variantId,
      normalizeSize(size) || null,
    );
    return { available: stock.available, error: null };
  } catch (err) {
    return { available: 0, error: err };
  }
};

const buildItemIssues = ({ isAvailable, stockSufficient, priceChanged }) => {
  const issues = [];
  if (!isAvailable) {
    issues.push(CART_ITEM_ISSUE.UNAVAILABLE);
  }
  if (isAvailable && !stockSufficient) {
    issues.push(CART_ITEM_ISSUE.INSUFFICIENT_STOCK);
  }
  if (priceChanged) {
    issues.push(CART_ITEM_ISSUE.PRICE_CHANGED);
  }
  return issues;
};

const enrichCartItems = async (items, variantById, productStatusById) => {
  const enriched = [];

  for (const item of items || []) {
    const variantId = String(item.productVariantId);
    const variant = variantById.get(variantId);
    const quantity = Number(item.quantity) || 0;
    const unitPriceSnapshot = Number(item.unitPriceSnapshot) || 0;
    const normalizedSize = normalizeSize(item.size);
    const isAvailable = isVariantPurchasable(variant, productStatusById);
    const currentUnitPrice = isAvailable ? getVariantEffectivePrice(variant) : 0;
    const priceChanged =
      isAvailable && Math.abs(currentUnitPrice - unitPriceSnapshot) > 0.001;

    let availableStock = 0;
    if (isAvailable) {
      const stockResult = await readAvailableStock(variantId, normalizedSize);
      availableStock = stockResult.available;
    }

    const stockSufficient = isAvailable && availableStock >= quantity;
    const issues = buildItemIssues({
      isAvailable,
      stockSufficient,
      priceChanged,
    });

    enriched.push({
      productId: String(item.productId),
      variantId,
      size: normalizedSize,
      quantity,
      unitPriceSnapshot,
      attributesSnapshot: attributesToObject(item.attributesSnapshot),
      lineTotal: quantity * unitPriceSnapshot,
      currentUnitPrice,
      lineTotalAtCurrentPrice: quantity * currentUnitPrice,
      availableStock,
      isAvailable,
      stockSufficient,
      priceChanged,
      issues,
    });
  }

  return enriched;
};

const buildCartResponse = async (cartDoc, ownerOrUserId) => {
  const owner = normalizeOwner(ownerOrUserId);
  if (!cartDoc) {
    return emptyCartResponse(owner);
  }

  const variantIds = [
    ...new Set(
      (cartDoc.items || []).map((item) => String(item.productVariantId)),
    ),
  ];

  const variants =
    variantIds.length > 0
      ? await ProductVariant.find({ _id: { $in: variantIds } })
          .select("productId price discountType discountValue attributes status")
          .lean()
      : [];

  const variantById = new Map(variants.map((row) => [String(row._id), row]));
  const productIds = [...new Set(variants.map((row) => String(row.productId)))];
  const products =
    productIds.length > 0
      ? await Product.find({ _id: { $in: productIds } })
          .select("status")
          .lean()
      : [];
  const productStatusById = new Map(
    products.map((row) => [String(row._id), row.status]),
  );

  const items = await enrichCartItems(
    cartDoc.items,
    variantById,
    productStatusById,
  );
  const subtotal = items.reduce((sum, row) => sum + row.lineTotal, 0);
  const subtotalAtCurrentPrices = items.reduce(
    (sum, row) => sum + row.lineTotalAtCurrentPrice,
    0,
  );
  const itemCount = items.reduce((sum, row) => sum + row.quantity, 0);
  const hasIssues = items.some((row) => row.issues.length > 0);

  return {
    id: String(cartDoc._id),
    userId: cartDoc.userId ? String(cartDoc.userId) : null,
    sessionId: cartDoc.sessionId || null,
    isGuest: !cartDoc.userId,
    items,
    itemCount,
    subtotal,
    subtotalAtCurrentPrices,
    hasIssues,
    couponCode: cartDoc.couponCode || "",
    updatedAt: cartDoc.updatedAt,
  };
};

const finalizeCartResponse = async (cartDoc, ownerOrUserId) => {
  const base = await buildCartResponse(cartDoc, ownerOrUserId);
  const { attachCouponTotals } = require("../coupon/couponService");
  return attachCouponTotals(base);
};

const loadPurchasableVariant = async (variantId) => {
  if (!isValidObjectId(variantId)) {
    return {
      ok: false,
      code: CART_ERROR.INVALID_VARIANT_ID,
      message: "Invalid product variant id",
      errors: [{ path: "variantId", msg: "Invalid product variant id." }],
    };
  }

  const variant = await ProductVariant.findById(variantId)
    .select("productId price discountType discountValue attributes status")
    .lean();

  if (!variant || Number(variant.status) !== ACTIVE_STATUS) {
    return {
      ok: false,
      code: CART_ERROR.VARIANT_NOT_AVAILABLE,
      message: "Product variant is not available",
      errors: [{ path: "variantId", msg: "Product variant is not available." }],
      statusCode: 404,
    };
  }

  const product = await Product.findById(variant.productId)
    .select("status")
    .lean();
  if (!product || Number(product.status) !== ACTIVE_STATUS) {
    return {
      ok: false,
      code: CART_ERROR.VARIANT_NOT_AVAILABLE,
      message: "Product is not available",
      errors: [{ path: "variantId", msg: "Product is not available." }],
      statusCode: 404,
    };
  }

  return { ok: true, variant };
};

const mapInventoryError = (err) => {
  const code = err?.code;
  const meta = err?.meta || {};

  if (code === INVENTORY_ERROR.INVALID_VARIANT_ID) {
    return {
      code: CART_ERROR.INVALID_VARIANT_ID,
      message: err.message,
      errors: [{ path: "variantId", msg: "Invalid product variant id." }],
      statusCode: 400,
    };
  }

  if (code === INVENTORY_ERROR.VARIANT_NOT_FOUND) {
    return {
      code: CART_ERROR.VARIANT_NOT_AVAILABLE,
      message: err.message,
      errors: [{ path: "variantId", msg: "Product variant is not available." }],
      statusCode: 404,
    };
  }

  if (code === INVENTORY_ERROR.SIZE_REQUIRED) {
    return {
      code: INVENTORY_ERROR.SIZE_REQUIRED,
      message: err.message,
      errors: [{ path: "size", msg: "Size is required for this variant." }],
      statusCode: 400,
    };
  }

  if (code === INVENTORY_ERROR.SIZE_NOT_FOUND) {
    return {
      code: INVENTORY_ERROR.SIZE_NOT_FOUND,
      message: err.message,
      errors: [
        { path: "size", msg: "Size is not available for this variant." },
      ],
      statusCode: 400,
    };
  }

  if (code === INVENTORY_ERROR.SIZE_NOT_ALLOWED) {
    return {
      code: INVENTORY_ERROR.SIZE_NOT_ALLOWED,
      message: err.message,
      errors: [{ path: "size", msg: "This variant does not use sizes." }],
      statusCode: 400,
    };
  }

  if (code === INVENTORY_ERROR.INSUFFICIENT_STOCK) {
    return {
      code: INVENTORY_ERROR.INSUFFICIENT_STOCK,
      message: "Insufficient stock",
      errors: [
        {
          path: "qty",
          msg: `Only ${meta.available ?? 0} item(s) available.`,
        },
      ],
      statusCode: 400,
      meta,
    };
  }

  if (code === INVENTORY_ERROR.INVALID_QUANTITY) {
    return {
      code: CART_ERROR.INVALID_QUANTITY,
      message: err.message,
      errors: [{ path: "qty", msg: "Quantity must be a positive integer." }],
      statusCode: 400,
    };
  }

  return null;
};

const findCartByOwner = async (ownerOrUserId) => {
  const owner = normalizeOwner(ownerOrUserId);
  if (owner.type === "user") {
    if (!isValidUserOwner(owner)) return null;
    return Cart.findOne({ userId: toObjectId(owner.userId) });
  }
  if (!isValidGuestOwner(owner)) return null;
  return Cart.findOne({ sessionId: owner.sessionId });
};

const getOrCreateCartDoc = async (ownerOrUserId) => {
  const owner = normalizeOwner(ownerOrUserId);
  if (owner.type === "guest" && !owner.sessionId) {
    return null;
  }

  let cart = await findCartByOwner(owner);
  if (cart) return cart;

  if (owner.type === "user") {
    cart = new Cart({ userId: toObjectId(owner.userId), items: [] });
  } else {
    cart = new Cart({ sessionId: owner.sessionId, items: [] });
  }
  return cart;
};

/**
 * Returns the cart with live stock and price checks per line.
 */
const getCart = async (ownerOrUserId) => {
  const owner = normalizeOwner(ownerOrUserId);
  if (owner.type === "guest" && !owner.sessionId) {
    return { ok: true, cart: emptyCartResponse(owner) };
  }
  const cart = await findCartByOwner(owner);
  return { ok: true, cart: await finalizeCartResponse(cart, owner) };
};

/**
 * Adds or merges a line on the user's cart. Snapshots unit price at add time.
 */
const addCartItem = async (ownerOrUserId, payload = {}) => {
  const owner = normalizeOwner(ownerOrUserId);
  const variantId = payload.variantId;
  const qty = normalizeQty(payload.qty ?? 1);

  if (!qty) {
    return {
      ok: false,
      code: CART_ERROR.INVALID_QUANTITY,
      message: "Quantity must be a positive integer",
      errors: [{ path: "qty", msg: "Quantity must be a positive integer." }],
      statusCode: 400,
    };
  }

  const variantResult = await loadPurchasableVariant(variantId);
  if (!variantResult.ok) {
    return { ok: false, ...variantResult };
  }

  const { variant } = variantResult;
  const normalizedSize = normalizeSize(payload.size);

  let stockResult;
  try {
    stockResult = await getAvailableStock(variantId, normalizedSize || null);
  } catch (err) {
    const mapped = mapInventoryError(err);
    if (mapped) {
      return { ok: false, ...mapped };
    }
    throw err;
  }

  if (owner.type === "guest" && !owner.sessionId) {
    return {
      ok: false,
      code: CART_ERROR.CART_NOT_FOUND,
      message: "Guest cart session is required.",
      statusCode: 400,
    };
  }

  let cart = await getOrCreateCartDoc(owner);

  const existingIndex = findItemIndex(cart.items, variantId, normalizedSize);
  const existingQty =
    existingIndex >= 0 ? Number(cart.items[existingIndex].quantity) || 0 : 0;
  const nextQty = existingQty + qty;

  if (nextQty > stockResult.available) {
    return {
      ok: false,
      code: INVENTORY_ERROR.INSUFFICIENT_STOCK,
      message: "Insufficient stock",
      errors: [
        {
          path: "qty",
          msg: `Only ${stockResult.available} item(s) available.`,
        },
      ],
      statusCode: 400,
      meta: {
        available: stockResult.available,
        requested: nextQty,
      },
    };
  }

  const line = {
    productId: variant.productId,
    productVariantId: variant._id,
    size: normalizedSize,
    attributesSnapshot: attributesToObject(variant.attributes),
    quantity: nextQty,
    unitPriceSnapshot: getVariantEffectivePrice(variant),
  };

  if (existingIndex >= 0) {
    cart.items[existingIndex] = line;
    cart.markModified("items");
  } else {
    cart.items.push(line);
  }

  await cart.save();

  return {
    ok: true,
    cart: await finalizeCartResponse(cart, owner),
  };
};

/**
 * Moves a cart line to a different size (merges if the target size already exists).
 */
const changeCartItemSize = async (
  ownerOrUserId,
  cart,
  variantId,
  currentSize,
  newSize,
  qty,
) => {
  const normalizedCurrent = normalizeSize(currentSize);
  const normalizedNew = normalizeSize(newSize);

  if (!normalizedNew || normalizedNew === normalizedCurrent) {
    return null;
  }

  const itemIndex = findItemIndex(cart.items, variantId, normalizedCurrent);
  if (itemIndex < 0) {
    return {
      ok: false,
      code: CART_ERROR.ITEM_NOT_FOUND,
      message: "Cart item not found",
      errors: [{ path: "variantId", msg: "Item is not in your cart." }],
      statusCode: 404,
    };
  }

  const variantResult = await loadPurchasableVariant(variantId);
  if (!variantResult.ok) {
    return { ok: false, ...variantResult };
  }

  const line = cart.items[itemIndex];
  const nextQty = qty || Number(line.quantity) || 1;

  let stockResult;
  try {
    stockResult = await getAvailableStock(variantId, normalizedNew || null);
  } catch (err) {
    const mapped = mapInventoryError(err);
    if (mapped) {
      return { ok: false, ...mapped };
    }
    throw err;
  }

  const targetIndex = findItemIndex(cart.items, variantId, normalizedNew);

  if (targetIndex >= 0 && targetIndex !== itemIndex) {
    const mergedQty = Number(cart.items[targetIndex].quantity) + nextQty;
    if (mergedQty > stockResult.available) {
      return {
        ok: false,
        code: INVENTORY_ERROR.INSUFFICIENT_STOCK,
        message: "Insufficient stock",
        errors: [
          {
            path: "newSize",
            msg: `Only ${stockResult.available} item(s) available in this size.`,
          },
        ],
        statusCode: 400,
        meta: {
          available: stockResult.available,
          requested: mergedQty,
        },
      };
    }
    cart.items[targetIndex].quantity = mergedQty;
    cart.items.splice(itemIndex, 1);
  } else {
    if (nextQty > stockResult.available) {
      return {
        ok: false,
        code: INVENTORY_ERROR.INSUFFICIENT_STOCK,
        message: "Insufficient stock",
        errors: [
          {
            path: "newSize",
            msg: `Only ${stockResult.available} item(s) available in this size.`,
          },
        ],
        statusCode: 400,
        meta: {
          available: stockResult.available,
          requested: nextQty,
        },
      };
    }
    cart.items[itemIndex].size = normalizedNew;
    cart.items[itemIndex].quantity = nextQty;
  }

  cart.markModified("items");
  await cart.save();

  return {
    ok: true,
    cart: await finalizeCartResponse(cart, ownerOrUserId),
  };
};

/**
 * Sets absolute quantity for an existing cart line (optional size change via newSize).
 */
const updateCartItem = async (ownerOrUserId, payload = {}) => {
  const owner = normalizeOwner(ownerOrUserId);
  const variantId = payload.variantId;
  const normalizedSize = normalizeSize(payload.size);
  const normalizedNewSize = normalizeSize(payload.newSize);
  const qtyFromPayload = normalizeQty(payload.qty);

  const cart = await findCartByOwner(owner);
  if (!cart) {
    return {
      ok: false,
      code: CART_ERROR.CART_NOT_FOUND,
      message: "Cart not found",
      errors: [{ path: "cart", msg: "Cart not found." }],
      statusCode: 404,
    };
  }

  const itemIndex = findItemIndex(cart.items, variantId, normalizedSize);
  if (itemIndex < 0) {
    return {
      ok: false,
      code: CART_ERROR.ITEM_NOT_FOUND,
      message: "Cart item not found",
      errors: [{ path: "variantId", msg: "Item is not in your cart." }],
      statusCode: 404,
    };
  }

  const currentQty = Number(cart.items[itemIndex].quantity) || 1;
  const qty = qtyFromPayload || currentQty;

  if (!qty) {
    return {
      ok: false,
      code: CART_ERROR.INVALID_QUANTITY,
      message: "Quantity must be a positive integer",
      errors: [{ path: "qty", msg: "Quantity must be a positive integer." }],
      statusCode: 400,
    };
  }

  if (normalizedNewSize && normalizedNewSize !== normalizedSize) {
    const sizeResult = await changeCartItemSize(
      owner,
      cart,
      variantId,
      normalizedSize,
      normalizedNewSize,
      qty,
    );
    if (sizeResult) {
      return sizeResult;
    }
  }

  const variantResult = await loadPurchasableVariant(variantId);
  if (!variantResult.ok) {
    return { ok: false, ...variantResult };
  }

  const sizeForStock = normalizedNewSize || normalizedSize;

  let stockResult;
  try {
    stockResult = await getAvailableStock(variantId, sizeForStock || null);
  } catch (err) {
    const mapped = mapInventoryError(err);
    if (mapped) {
      return { ok: false, ...mapped };
    }
    throw err;
  }

  const qtyItemIndex = findItemIndex(cart.items, variantId, sizeForStock);
  if (qtyItemIndex < 0) {
    return {
      ok: false,
      code: CART_ERROR.ITEM_NOT_FOUND,
      message: "Cart item not found",
      errors: [{ path: "variantId", msg: "Item is not in your cart." }],
      statusCode: 404,
    };
  }

  if (qty > stockResult.available) {
    return {
      ok: false,
      code: INVENTORY_ERROR.INSUFFICIENT_STOCK,
      message: "Insufficient stock",
      errors: [
        {
          path: "qty",
          msg: `Only ${stockResult.available} item(s) available.`,
        },
      ],
      statusCode: 400,
      meta: {
        available: stockResult.available,
        requested: qty,
      },
    };
  }

  cart.items[qtyItemIndex].quantity = qty;
  cart.markModified("items");
  await cart.save();

  return {
    ok: true,
    cart: await finalizeCartResponse(cart, owner),
  };
};

/**
 * Removes a line from the cart by variant id and optional size.
 */
const removeCartItem = async (ownerOrUserId, variantId, size = null) => {
  const owner = normalizeOwner(ownerOrUserId);
  if (!isValidObjectId(variantId)) {
    return {
      ok: false,
      code: CART_ERROR.INVALID_VARIANT_ID,
      message: "Invalid product variant id",
      errors: [{ path: "variantId", msg: "Invalid product variant id." }],
      statusCode: 400,
    };
  }

  const cart = await findCartByOwner(owner);
  if (!cart) {
    return {
      ok: false,
      code: CART_ERROR.CART_NOT_FOUND,
      message: "Cart not found",
      errors: [{ path: "cart", msg: "Cart not found." }],
      statusCode: 404,
    };
  }

  const normalizedSize = normalizeSize(size);
  const itemIndex = findItemIndex(cart.items, variantId, normalizedSize);
  if (itemIndex < 0) {
    return {
      ok: false,
      code: CART_ERROR.ITEM_NOT_FOUND,
      message: "Cart item not found",
      errors: [{ path: "variantId", msg: "Item is not in your cart." }],
      statusCode: 404,
    };
  }

  cart.items.splice(itemIndex, 1);
  cart.markModified("items");
  await cart.save();

  return {
    ok: true,
    cart: await finalizeCartResponse(cart, owner),
  };
};

/**
 * Removes all lines and coupon from the user's cart.
 */
const clearCart = async (ownerOrUserId) => {
  const owner = normalizeOwner(ownerOrUserId);
  if (owner.type === "user" && !isValidUserOwner(owner)) {
    return {
      ok: false,
      code: CART_ERROR.INVALID_VARIANT_ID,
      message: "Invalid user id",
      errors: [{ path: "userId", msg: "Invalid user id." }],
      statusCode: 400,
    };
  }
  if (owner.type === "guest" && !isValidGuestOwner(owner)) {
    return {
      ok: false,
      code: CART_ERROR.CART_NOT_FOUND,
      message: "Guest cart session is required.",
      statusCode: 400,
    };
  }

  const cart = await findCartByOwner(owner);
  if (!cart) {
    return {
      ok: true,
      cart: await finalizeCartResponse(null, owner),
      cleared: false,
    };
  }

  const hadContents =
    (Array.isArray(cart.items) && cart.items.length > 0) ||
    Boolean(String(cart.couponCode || "").trim());

  cart.items = [];
  cart.couponCode = "";
  cart.markModified("items");
  await cart.save();

  return {
    ok: true,
    cart: await finalizeCartResponse(cart, owner),
    cleared: hadContents,
  };
};

module.exports = {
  CART_ERROR,
  CART_ITEM_ISSUE,
  isValidObjectId,
  normalizeSize,
  normalizeQty,
  findItemIndex,
  emptyCartResponse,
  buildCartResponse,
  finalizeCartResponse,
  findCartByOwner,
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
};
