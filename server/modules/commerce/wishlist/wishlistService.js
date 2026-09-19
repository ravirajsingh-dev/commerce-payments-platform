const mongoose = require("mongoose");
const Wishlist = require("../../../models/Wishlist");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const { getVariantEffectivePrice } = require("../../../utils/variantPricing");
const Attribute = require("../../../models/Attribute");
const Inventory = require("../../../models/Inventory");
const { getAvailableStock } = require("../inventory/inventoryService");

const SIZE_ATTRIBUTE_CODES = new Set(["size", "sizes"]);

const ACTIVE_STATUS = 1;

const WISHLIST_ERROR = {
  INVALID_VARIANT_ID: "INVALID_VARIANT_ID",
  VARIANT_NOT_AVAILABLE: "VARIANT_NOT_AVAILABLE",
  ALREADY_IN_WISHLIST: "ALREADY_IN_WISHLIST",
  ITEM_NOT_FOUND: "ITEM_NOT_FOUND",
  WISHLIST_NOT_FOUND: "WISHLIST_NOT_FOUND",
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const normalizeSize = (size) => {
  if (size === undefined || size === null) return "";
  return String(size).trim().toLowerCase();
};

const buildSizeOptions = (variant) => {
  if (!variant || !Array.isArray(variant.sizes) || variant.sizes.length === 0) {
    return [];
  }
  return variant.sizes.map((row) => ({
    value: normalizeSize(row?.value),
    label: String(row?.label || row?.value || "").trim() || String(row?.value || "").toUpperCase(),
    stock: Math.max(0, Number(row?.stock) || 0),
  }));
};

const pickDefaultSize = (sizeOptions = []) => {
  if (!sizeOptions.length) return "";
  const inStock = sizeOptions.find((row) => row.stock > 0);
  return inStock?.value || sizeOptions[0]?.value || "";
};

const humanizeAttributeValue = (raw) => {
  const text = String(raw || "")
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
  if (!text) return "";
  return text
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      if (/^[A-Z0-9]{1,4}$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
};

const buildAttributeLabelMap = (definitions = []) => {
  const map = new Map();
  for (const def of definitions) {
    const code = String(def?.code || "").toLowerCase();
    if (!code) continue;
    const optionMap = new Map();
    for (const option of def?.options || []) {
      optionMap.set(
        String(option?.value || "").toLowerCase(),
        option?.label || option?.value || "",
      );
    }
    map.set(code, { name: def?.name || code, optionMap });
  }
  return map;
};

const buildVariantAttributeLines = (variant, attributeDefinitions = []) => {
  const attrs = variant?.attributes || {};
  const labelMap = buildAttributeLabelMap(attributeDefinitions);
  const lines = [];

  for (const def of attributeDefinitions) {
    const code = String(def?.code || "").trim().toLowerCase();
    if (!code || SIZE_ATTRIBUTE_CODES.has(code)) continue;
    const raw =
      attrs[code] ??
      attrs[def.code] ??
      attrs[String(def?.code || "").trim()];
    const value = String(raw || "").trim();
    if (!value) continue;
    const meta = labelMap.get(code);
    const valueLabel =
      meta?.optionMap?.get(value.toLowerCase()) || humanizeAttributeValue(value);
    lines.push({
      code,
      label: String(meta?.name || def?.name || code).trim(),
      value: valueLabel,
    });
  }

  return lines;
};

const loadAttributeDefinitionsBySetIds = async (setIds = []) => {
  const unique = [...new Set(setIds.filter(Boolean).map(String))];
  if (!unique.length) return new Map();

  const definitions = await Attribute.find({
    attributeSetId: { $in: unique.map(toObjectId) },
    isActive: true,
  })
    .select("attributeSetId name code options")
    .sort({ name: 1 })
    .lean();

  const bySetId = new Map();
  for (const row of definitions) {
    const key = String(row.attributeSetId);
    if (!bySetId.has(key)) bySetId.set(key, []);
    bySetId.get(key).push(row);
  }
  return bySetId;
};

const emptyWishlistResponse = (userId) => ({
  id: null,
  userId: String(userId),
  items: [],
  itemCount: 0,
  updatedAt: null,
});

const totalSizeStock = (sizes = []) =>
  (sizes || []).reduce((sum, row) => sum + Math.max(0, Number(row?.stock) || 0), 0);

const resolveVariantInStock = async (variant) => {
  if (!variant) return false;
  if (Array.isArray(variant.sizes) && variant.sizes.length > 0) {
    return totalSizeStock(variant.sizes) > 0;
  }
  try {
    const stock = await getAvailableStock(variant._id, null);
    return Number(stock?.available || 0) > 0;
  } catch {
    const row = await Inventory.findOne({ productVariantId: variant._id })
      .select("stock")
      .lean();
    return Number(row?.stock || 0) > 0;
  }
};

const loadPurchasableVariant = async (variantId) => {
  if (!isValidObjectId(variantId)) {
    return {
      ok: false,
      code: WISHLIST_ERROR.INVALID_VARIANT_ID,
      message: "Invalid product variant id",
      errors: [{ path: "variantId", msg: "Invalid product variant id." }],
      statusCode: 400,
    };
  }

  const variant = await ProductVariant.findById(variantId)
    .select("productId name sku price images sizes attributes status")
    .lean();

  if (!variant || Number(variant.status) !== ACTIVE_STATUS) {
    return {
      ok: false,
      code: WISHLIST_ERROR.VARIANT_NOT_AVAILABLE,
      message: "Product variant is not available",
      errors: [{ path: "variantId", msg: "Product variant is not available." }],
      statusCode: 404,
    };
  }

  const product = await Product.findById(variant.productId)
    .select("name slug status")
    .lean();
  if (!product || Number(product.status) !== ACTIVE_STATUS) {
    return {
      ok: false,
      code: WISHLIST_ERROR.VARIANT_NOT_AVAILABLE,
      message: "Product is not available",
      errors: [{ path: "variantId", msg: "Product is not available." }],
      statusCode: 404,
    };
  }

  return { ok: true, variant, product };
};

const serializeWishlistItem = async (
  item,
  variantById,
  productById,
  attributeDefsBySetId,
) => {
  const variant = variantById.get(String(item.productVariantId));
  const product = productById.get(String(item.productId));
  const attributeSetId = String(product?.attributeSetId || "");
  const attributeDefinitions = attributeDefsBySetId.get(attributeSetId) || [];
  const attributeLines = buildVariantAttributeLines(variant, attributeDefinitions);
  const imageUrl = variant?.images?.[0]?.url || "";
  const sizeOptions = buildSizeOptions(variant);
  const requiresSize = sizeOptions.length > 0;
  const defaultSize = pickDefaultSize(sizeOptions);
  let inStock;
  if (requiresSize) {
    const defaultRow = sizeOptions.find((row) => row.value === defaultSize);
    inStock = Boolean(defaultRow && defaultRow.stock > 0);
  } else {
    inStock = await resolveVariantInStock(variant);
  }
  const isAvailable =
    Boolean(variant) &&
    Boolean(product) &&
    Number(variant?.status) === ACTIVE_STATUS &&
    Number(product?.status) === ACTIVE_STATUS;

  return {
    variantId: String(item.productVariantId),
    productId: String(item.productId),
    addedAt: item.addedAt,
    displayName:
      String(variant?.name || "").trim() || String(product?.name || "").trim() || "Product",
    productName: String(product?.name || "").trim(),
    productSlug: String(product?.slug || "").trim().toLowerCase(),
    sku: String(variant?.sku || "").trim().toUpperCase(),
    price: getVariantEffectivePrice(variant),
    listPrice: Number(variant?.price) || 0,
    discountType: variant?.discountType || null,
    discountValue: Number(variant?.discountValue) || 0,
    imageUrl,
    requiresSize,
    sizeOptions,
    defaultSize,
    attributeLines,
    inStock,
    isAvailable,
  };
};

const buildWishlistResponse = async (wishlistDoc, userId) => {
  if (!wishlistDoc) {
    return emptyWishlistResponse(userId);
  }

  const rawItems = Array.isArray(wishlistDoc.items) ? wishlistDoc.items : [];
  const variantIds = [...new Set(rawItems.map((row) => String(row.productVariantId)))];
  const productIds = [...new Set(rawItems.map((row) => String(row.productId)))];

  const [variants, products] = await Promise.all([
    ProductVariant.find({ _id: { $in: variantIds } })
      .select("productId name sku price discountType discountValue images sizes attributes status")
      .lean(),
    Product.find({ _id: { $in: productIds } })
      .select("name slug status attributeSetId")
      .lean(),
  ]);

  const variantById = new Map(variants.map((row) => [String(row._id), row]));
  const productById = new Map(products.map((row) => [String(row._id), row]));
  const attributeDefsBySetId = await loadAttributeDefinitionsBySetIds(
    products.map((row) => row.attributeSetId),
  );

  const items = [];
  for (const row of rawItems) {
    items.push(
      await serializeWishlistItem(row, variantById, productById, attributeDefsBySetId),
    );
  }

  items.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

  return {
    id: String(wishlistDoc._id),
    userId: String(wishlistDoc.userId),
    items,
    itemCount: items.length,
    updatedAt: wishlistDoc.updatedAt,
  };
};

const getOrCreateWishlistDoc = async (userId) => {
  const userObjectId = toObjectId(userId);
  let doc = await Wishlist.findOne({ userId: userObjectId });
  if (!doc) {
    doc = await Wishlist.create({ userId: userObjectId, items: [] });
  }
  return doc;
};

const getWishlist = async (userId) => {
  const userObjectId = toObjectId(userId);
  if (!userObjectId) {
    return {
      ok: false,
      message: "Authentication required.",
      statusCode: 401,
    };
  }

  const doc = await Wishlist.findOne({ userId: userObjectId });
  const wishlist = await buildWishlistResponse(doc, userId);
  return { ok: true, wishlist };
};

const addWishlistItem = async (userId, variantId) => {
  const userObjectId = toObjectId(userId);
  if (!userObjectId) {
    return {
      ok: false,
      message: "Authentication required.",
      statusCode: 401,
    };
  }

  const loaded = await loadPurchasableVariant(variantId);
  if (!loaded.ok) {
    return loaded;
  }

  const { variant, product } = loaded;
  const doc = await getOrCreateWishlistDoc(userId);
  const exists = doc.items.some(
    (row) => String(row.productVariantId) === String(variant._id),
  );
  if (exists) {
    return {
      ok: false,
      code: WISHLIST_ERROR.ALREADY_IN_WISHLIST,
      message: "Item is already in your wishlist.",
      statusCode: 409,
    };
  }

  doc.items.push({
    productId: variant.productId,
    productVariantId: variant._id,
    addedAt: new Date(),
  });
  await doc.save();

  const wishlist = await buildWishlistResponse(doc, userId);
  return {
    ok: true,
    wishlist,
    message: "Added to wishlist.",
  };
};

const removeWishlistItem = async (userId, variantId) => {
  const userObjectId = toObjectId(userId);
  const variantObjectId = toObjectId(variantId);

  if (!userObjectId) {
    return {
      ok: false,
      message: "Authentication required.",
      statusCode: 401,
    };
  }

  if (!variantObjectId) {
    return {
      ok: false,
      code: WISHLIST_ERROR.INVALID_VARIANT_ID,
      errors: [{ path: "variantId", msg: "Invalid product variant id." }],
      statusCode: 400,
    };
  }

  const doc = await Wishlist.findOne({ userId: userObjectId });
  if (!doc) {
    return {
      ok: false,
      code: WISHLIST_ERROR.WISHLIST_NOT_FOUND,
      message: "Wishlist not found.",
      statusCode: 404,
    };
  }

  const nextItems = doc.items.filter(
    (row) => String(row.productVariantId) !== String(variantObjectId),
  );
  if (nextItems.length === doc.items.length) {
    return {
      ok: false,
      code: WISHLIST_ERROR.ITEM_NOT_FOUND,
      message: "Item is not in your wishlist.",
      statusCode: 404,
    };
  }

  doc.items = nextItems;
  await doc.save();

  const wishlist = await buildWishlistResponse(doc, userId);
  return {
    ok: true,
    wishlist,
    message: "Removed from wishlist.",
  };
};

const toggleWishlistItem = async (userId, variantId) => {
  const current = await getWishlist(userId);
  if (!current.ok) return current;

  const inList = current.wishlist.items.some(
    (row) => String(row.variantId) === String(variantId),
  );
  if (inList) {
    return removeWishlistItem(userId, variantId);
  }
  return addWishlistItem(userId, variantId);
};

module.exports = {
  WISHLIST_ERROR,
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  toggleWishlistItem,
  buildWishlistResponse,
};
