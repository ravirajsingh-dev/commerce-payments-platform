export const VARIANT_DISCOUNT_TYPE_OPTIONS = [
  { value: "", label: "No discount" },
  { value: "percentage", label: "Percentage (%)" },
  { value: "flat", label: "Flat amount (₹)" },
];

export const getVariantDiscountTypeOptionByValue = (value) =>
  VARIANT_DISCOUNT_TYPE_OPTIONS.find(
    (item) => String(item.value) === String(value ?? ""),
  ) || VARIANT_DISCOUNT_TYPE_OPTIONS[0];

/** Client-side validation for optional variant discount fields. */
export const validateVariantDiscountFields = (formData = {}) => {
  const errors = {};
  const type = String(formData.discountType || "").trim();
  if (!type) return errors;

  const listPrice = Number(formData.price);
  const rawVal = formData.discountValue;
  const val = Number(rawVal);

  if (rawVal === "" || Number.isNaN(val) || val <= 0) {
    errors.discountValue = "Enter a discount greater than zero.";
    return errors;
  }

  if (type === "percentage") {
    if (val > 100) errors.discountValue = "Percentage cannot exceed 100.";
  } else if (type === "flat") {
    if (Number.isFinite(listPrice) && val > listPrice) {
      errors.discountValue = "Flat discount cannot exceed the list price.";
    }
  }

  return errors;
};

export const buildVariantDiscountPayload = (formData = {}) => {
  const type = String(formData.discountType || "").trim();
  if (!type) {
    return { discountType: null, discountValue: 0 };
  }
  return {
    discountType: type,
    discountValue: Number(formData.discountValue) || 0,
  };
};

const roundMoney = (value) => Math.round(Number(value) * 100) / 100;

/** Mirrors server variantPricing — sale price after MRP discount. */
export const computeVariantSalePrice = (price, discountType, discountValue) => {
  const listPrice = Math.max(0, Number(price) || 0);
  const type = String(discountType || "").trim().toLowerCase();
  const val = Number(discountValue);
  if (!type || !Number.isFinite(val) || val <= 0) return listPrice;
  if (type === "percentage") {
    const pct = Math.min(100, Math.max(0, val));
    return roundMoney(listPrice * (1 - pct / 100));
  }
  if (type === "flat") {
    return roundMoney(Math.max(0, listPrice - Math.min(listPrice, val)));
  }
  return listPrice;
};

export const getVariantListPrice = (variant) =>
  Math.max(0, Number(variant?.price) || 0);

export const getVariantSalePrice = (variant) => {
  if (variant?.salePrice != null && Number.isFinite(Number(variant.salePrice))) {
    return Math.max(0, Number(variant.salePrice));
  }
  return computeVariantSalePrice(
    variant?.price,
    variant?.discountType,
    variant?.discountValue,
  );
};

export const variantHasDiscount = (variant) => {
  if (variant?.hasDiscount != null) return Boolean(variant.hasDiscount);
  const list = getVariantListPrice(variant);
  return getVariantSalePrice(variant) < list - 0.001;
};

const SIZE_ATTRIBUTE_CODES = new Set(["size", "sizes"]);

const isSizeCode = (code) => SIZE_ATTRIBUTE_CODES.has(String(code || "").toLowerCase());

const getAttributeEntries = (attrs) => {
  if (attrs == null) return [];
  if (attrs instanceof Map) {
    return Array.from(attrs.entries());
  }
  if (typeof attrs.forEach === "function" && typeof attrs.get === "function") {
    const pairs = [];
    attrs.forEach((value, key) => {
      pairs.push([key, value]);
    });
    return pairs;
  }
  if (typeof attrs === "object") {
    return Object.entries(attrs);
  }
  return [];
};

/**
 * Same rules as server `normalizeAttributesObject` — drops size axis keys so fingerprints
 * match persisted variant `attributes` / uniqueness semantics.
 */
const normalizeVariantAttributesForFingerprint = (attrs) => {
  const next = {};
  getAttributeEntries(attrs).forEach(([key, value]) => {
    const cleanKey = String(key || "")
      .trim()
      .toLowerCase();
    if (!cleanKey || isSizeCode(cleanKey)) return;
    next[cleanKey] = String(value ?? "").trim();
  });
  return next;
}

/** Uppercase A–Z / 0–9 only, capped length (SKU-safe). */
const sanitizeSkuSegment = (raw, maxLen = 12) => {
  const t = String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
  return (t || "X").slice(0, Math.max(1, maxLen));
}

const SIZE_RANK_GROUPS = [
  ["6XS"],
  ["5XS"],
  ["4XS"],
  ["XXXS", "3XS"],
  ["XXS", "2XS"],
  ["XS"],
  ["S", "SMALL"],
  ["M", "MEDIUM"],
  ["L", "LARGE"],
  ["XL"],
  ["XXL", "2XL"],
  ["XXXL", "3XL"],
  ["XXXXL", "4XL"],
  ["5XL"],
  ["6XL"],
  ["7XL"],
  ["8XL"],
  ["OS", "ONESIZE", "FREE", "FS"],
];

const normalizeSizeToken = (raw) =>
  String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s._-]+/g, "");

const SIZE_RANK_LOOKUP = (() => {
  const map = new Map();
  SIZE_RANK_GROUPS.forEach((aliases, index) => {
    aliases.forEach((a) => {
      map.set(normalizeSizeToken(a), index);
    });
  });
  return map;
})();

const canonicalSizeRank = (value) => {
  const k = normalizeSizeToken(value);
  if (!k) return 5000;
  if (SIZE_RANK_LOOKUP.has(k)) return SIZE_RANK_LOOKUP.get(k);
  if (/^\d{1,3}$/.test(k)) return 1000 + parseInt(k, 10);
  return 3000;
};

const sortSizesForSku = (rows = []) =>
  [...rows].sort(
    (a, b) =>
      canonicalSizeRank(a?.value) - canonicalSizeRank(b?.value) ||
      String(a?.value || "").localeCompare(String(b?.value || "")),
  );

/**
 * Short Base36 uniqueness tail (uppercase). Mixes ms + random to avoid collisions on rapid creates.
 */
const base36SkuTimestamp = () => {
  const ms = Date.now();
  const rnd = Math.floor(Math.random() * 1296);
  const a = ms.toString(36).toUpperCase();
  const b = rnd.toString(36).toUpperCase().padStart(2, "0");
  const merged = (a + b).replace(/[^A-Z0-9]/g, "").slice(-10);
  return merged.length >= 6 ? merged : (ms + rnd).toString(36).toUpperCase();
}

/** 5-digit numeric derived from product ObjectId tail (stable per product, fits example). */
const productIdSkuDigits = (productId) => {
  const hex = String(productId || "")
    .replace(/[^a-f0-9]/gi, "")
    .slice(-8);
  if (!hex) return "00000";
  const n = parseInt(hex.slice(-6), 16) % 100000;
  return String(n).padStart(5, "0");
}

const categoryAbbrev = (primaryCategory) => {
  const slug = String(primaryCategory?.slug || "")
    .toLowerCase()
    .trim();
  const parts = slug.split(/[^a-z0-9]+/).filter((p) => p.length > 0);
  if (parts.length >= 2) {
    const initials = parts.map((p) => p[0].toUpperCase()).join("");
    return sanitizeSkuSegment(initials, 4);
  }
  const fromSlug = slug.replace(/[^a-z0-9]/gi, "");
  if (fromSlug.length >= 3) return sanitizeSkuSegment(fromSlug.slice(0, 4), 4);
  const name = String(primaryCategory?.name || "CAT")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
  return sanitizeSkuSegment(name.slice(0, 4), 4);
}

const valueAbbrev = (value, max = 3) => {
  const v = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
  if (!v) return "GEN";
  const mono = {
    BLACK: "BLK",
    NAVY: "NVY",
    WHITE: "WHT",
    RED: "RED",
    BLUE: "BLU",
    GREEN: "GRN",
    SILK: "SLK",
    COTTON: "CTN",
    BEIGE: "BGE",
    GREY: "GRY",
    GRAY: "GRY",
    MAROON: "MRN",
  };
  if (mono[v]) return mono[v].slice(0, max);
  return sanitizeSkuSegment(v, max);
}

/** One segment for all non-size variant attributes (colour / fabric / …), max 6 chars. */
const variantAttrSegment = (attrs, sortedAttributeCodes = []) => {
  const norm = normalizeVariantAttributesForFingerprint(attrs);
  const codes = [...sortedAttributeCodes].filter(
    (c) => norm[String(c).toLowerCase()] && !isSizeCode(c),
  );
  let acc = "";
  for (const code of codes) {
    const val = norm[String(code).toLowerCase()];
    if (!val) continue;
    acc += valueAbbrev(val, 3);
    if (acc.length >= 6) break;
  }
  return sanitizeSkuSegment(acc || "STD", 6);
}

const sizeSegment = (sizes = [], legacyAttributes = {}) => {
  const list = Array.isArray(sizes) ? sizes : [];
  if (list.length > 0) {
    const first = sortSizesForSku(list)[0];
    const raw = String(first?.value || first?.label || "").trim();
    return sanitizeSkuSegment(raw.replace(/[^A-Z0-9]/gi, ""), 4);
  }
  const legacy = Object.entries(legacyAttributes || {}).find(([c]) => isSizeCode(c))?.[1];
  if (legacy) return sanitizeSkuSegment(String(legacy), 4);
  return "NSZ";
}

/**
 * BRAND-CATEGORY-PRODUCTID-COLORFAB-SIZE-BASE36TS
 * Example: RR-TSH-10245-BLK-XL-MALF2XK
 *
 * @param {object} opts
 * @param {string} [opts.brandCode] — from Common Settings abbreviation (e.g. RR)
 * @param {object|null} [opts.primaryCategory] — populated category { name, slug }
 * @param {string} opts.productId — product Mongo _id
 * @param {object} opts.attributes — variant attributes (size axis excluded from middle segment)
 * @param {Array<{value?:string,label?:string}>} [opts.sizes]
 * @param {string[]} [opts.sortedAttributeCodes] — non-size variant attribute codes, sorted
 */
export const generateVariantSku = (opts = {}) => {
  const brand = sanitizeSkuSegment(opts.brandCode || "RR", 4);
  const category = categoryAbbrev(opts.primaryCategory || {});
  const prodDigits = productIdSkuDigits(opts.productId);
  const shade = variantAttrSegment(opts.attributes || {}, opts.sortedAttributeCodes || []);
  const size = sizeSegment(opts.sizes || [], opts.attributes || {});
  const ts = base36SkuTimestamp();
  const sku = [brand, category, prodDigits, shade, size, ts].join("-");
  return sku.slice(0, 120);
}
