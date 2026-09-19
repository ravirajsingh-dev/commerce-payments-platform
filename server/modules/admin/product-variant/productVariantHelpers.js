const { DEFAULT_PAGE_SIZE } = require("../../../config/constants");
const { normalizePublicId } = require("../../../utils/r2Helper");
const {
  VALID_DISCOUNT_TYPES,
  enrichVariantPricing,
  normalizeVariantDiscount,
} = require("../../../utils/variantPricing");

/**
 * Attribute codes that represent the per-variant stock axis (Size).
 * These values are stored in the dedicated `sizes` array on the variant doc rather than
 * the generic `attributes` map, so a single variant ("look") can ship multiple sizes
 * with per-size stock instead of producing one variant doc per size.
 */
const SIZE_ATTRIBUTE_CODES = new Set(["size", "sizes"]);

const isSizeCode = (code) => SIZE_ATTRIBUTE_CODES.has(String(code || "").toLowerCase());

const buildListInput = (req) => {
  const source = {
    ...(req.body || {}),
    ...(req.query || {}),
  };

  const limit =
    Number(source.limit) > 0 ? Number(source.limit) : DEFAULT_PAGE_SIZE;
  const page = Number(source.page) > 0 ? Number(source.page) : 1;
  const orderBy = source.orderBy || "createdAt";
  const ascending = source.ascending || "desc";

  let filters = [];
  if (typeof source.filters === "string") {
    filters = source.filters
      .split(",")
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  } else if (Array.isArray(source.filters)) {
    filters = source.filters
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  let query = {};
  if (typeof source.query === "string") {
    try {
      query = JSON.parse(source.query);
    } catch (e) {
      query = {};
    }
  } else if (typeof source.query === "object" && source.query !== null) {
    query = source.query;
  }

  return { limit, page, orderBy, ascending, filters, query };
};

/**
 * Cleans the variant attributes map. Size axis codes are intentionally dropped here so they
 * never end up in `attributes` / fingerprint — they belong to the dedicated `sizes` array.
 */
const normalizeAttributesObject = (attributes = {}) => {
  if (!attributes || typeof attributes !== "object") return {};
  const next = {};
  Object.entries(attributes).forEach(([key, value]) => {
    const cleanKey = String(key || "")
      .trim()
      .toLowerCase();
    if (!cleanKey || isSizeCode(cleanKey)) return;
    next[cleanKey] = String(value ?? "").trim();
  });
  return next;
};

const normalizeSku = (sku) =>
  String(sku || "")
    .trim()
    .toUpperCase();

const normalizeVariantName = (value, max = 180) => {
  const text = String(value || "").trim();
  return text.length > max ? text.slice(0, max) : text;
};

const normalizeShortDescription = (value, max = 500) => {
  const text = String(value || "").trim();
  return text.length > max ? text.slice(0, max) : text;
};

const normalizeSizeDescription = (value, max = 500) => {
  const text = String(value ?? "").trim();
  return text.length > max ? text.slice(0, max) : text;
};

const normalizeVariantImages = (images = []) => {
  if (!Array.isArray(images)) return [];
  return images
    .map((image) => {
      const url = String(image?.url || "").trim();
      const normalizedPublicId = normalizePublicId(image?.publicId || image?.url || "");
      return {
        url,
        publicId: normalizedPublicId,
      };
    })
    .filter((image) => image.url && image.publicId);
};

const normalizeStock = (stock, fallback = 0) => {
  if (stock === undefined || stock === null || stock === "") return fallback;
  const parsed = Number(stock);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.trunc(parsed));
};

/**
 * Cleans the variant sizes array: dedupes by value (case-insensitive), trims labels/SKUs,
 * coerces stock to a non-negative integer, drops entries without a value, and preserves
 * the admin-provided order.
 */
const normalizeSizes = (sizes = []) => {
  if (!Array.isArray(sizes)) return [];
  const seen = new Set();
  const result = [];
  sizes.forEach((row) => {
    if (!row || typeof row !== "object") return;
    const value = String(row.value ?? "").trim().toLowerCase();
    if (!value || seen.has(value)) return;
    seen.add(value);
    const label = String(row.label ?? value).trim() || value.toUpperCase();
    const sku = String(row.sku ?? "").trim();
    const stock = normalizeStock(row.stock, 0);
    const description = normalizeSizeDescription(row.description);
    result.push({ value, label, sku, stock, description });
  });
  return result;
};

const variantDocToPlain = (doc) => {
  if (!doc) return null;
  const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
  if (plain.attributes && typeof plain.attributes.forEach === "function" && typeof plain.attributes.entries === "function") {
    plain.attributes = Object.fromEntries(plain.attributes);
  }
  if (!Array.isArray(plain.images)) plain.images = [];
  if (!Array.isArray(plain.sizes)) plain.sizes = [];
  if (plain.stock === undefined) plain.stock = 0;
  if (typeof plain.name !== "string") plain.name = "";
  if (typeof plain.shortDescription !== "string") plain.shortDescription = "";
  plain.isNewArrival = Boolean(plain.isNewArrival);
  if (plain.discountType != null && !VALID_DISCOUNT_TYPES.has(String(plain.discountType))) {
    plain.discountType = null;
  }
  if (plain.discountValue == null || !Number.isFinite(Number(plain.discountValue))) {
    plain.discountValue = 0;
  }
  return enrichVariantPricing(plain);
};

const normalizeIsNewArrival = (value) => {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  return false;
};

const normalizeVariantDiscountFields = (discountType, discountValue, price) => {
  const listPrice = Math.max(0, Number(price) || 0);
  const normalized = normalizeVariantDiscount({
    discountType,
    discountValue,
    price: listPrice,
  });
  return {
    discountType: normalized.discountType,
    discountValue: normalized.discountValue,
  };
};

/** Total stock visible to the storefront = sum of size stocks (if any) else legacy single stock. */
const computeVariantTotalStock = (variant, legacyStock = 0) => {
  if (Array.isArray(variant?.sizes) && variant.sizes.length > 0) {
    return variant.sizes.reduce(
      (sum, row) => sum + Math.max(0, Number(row?.stock) || 0),
      0,
    );
  }
  return Math.max(0, Number(legacyStock) || 0);
};

module.exports = {
  MAX_BULK_VARIANTS: 100,
  SIZE_ATTRIBUTE_CODES,
  isSizeCode,
  buildListInput,
  normalizeAttributesObject,
  normalizeSku,
  normalizeVariantName,
  normalizeShortDescription,
  normalizeVariantImages,
  normalizeStock,
  normalizeSizes,
  variantDocToPlain,
  normalizeIsNewArrival,
  normalizeVariantDiscountFields,
  computeVariantTotalStock,
};
