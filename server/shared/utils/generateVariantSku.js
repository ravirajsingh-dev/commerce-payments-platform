/**
 * Server-side variant SKU (mirrors admin variantHelpers.generateVariantSku).
 * Format: BRAND-CATEGORY-PRODUCTID-SHADE-SIZE-BASE36TS
 */

const SIZE_ATTRIBUTE_CODES = new Set(["size", "sizes"]);
const isSizeCode = (code) => SIZE_ATTRIBUTE_CODES.has(String(code || "").toLowerCase());

const sanitizeSkuSegment = (raw, maxLen = 12) => {
  const t = String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
  return (t || "X").slice(0, Math.max(1, maxLen));
};

const normalizeVariantAttributesForFingerprint = (attrs) => {
  const next = {};
  if (!attrs || typeof attrs !== "object") return next;
  Object.entries(attrs).forEach(([key, value]) => {
    const cleanKey = String(key || "")
      .trim()
      .toLowerCase();
    if (!cleanKey || isSizeCode(cleanKey)) return;
    next[cleanKey] = String(value ?? "").trim();
  });
  return next;
};

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

const base36SkuTimestamp = () => {
  const ms = Date.now();
  const rnd = Math.floor(Math.random() * 1296);
  const a = ms.toString(36).toUpperCase();
  const b = rnd.toString(36).toUpperCase().padStart(2, "0");
  const merged = (a + b).replace(/[^A-Z0-9]/g, "").slice(-10);
  return merged.length >= 6 ? merged : (ms + rnd).toString(36).toUpperCase();
};

const productIdSkuDigits = (productId) => {
  const hex = String(productId || "")
    .replace(/[^a-f0-9]/gi, "")
    .slice(-8);
  if (!hex) return "00000";
  const n = parseInt(hex.slice(-6), 16) % 100000;
  return String(n).padStart(5, "0");
};

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
};

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
};

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
};

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
};

const generateVariantSku = (opts = {}) => {
  const brand = sanitizeSkuSegment(opts.brandCode || "RR", 4);
  const category = categoryAbbrev(opts.primaryCategory || {});
  const prodDigits = productIdSkuDigits(opts.productId);
  const shade = variantAttrSegment(opts.attributes || {}, opts.sortedAttributeCodes || []);
  const size = sizeSegment(opts.sizes || [], opts.attributes || {});
  const ts = base36SkuTimestamp();
  return [brand, category, prodDigits, shade, size, ts].join("-").slice(0, 120);
};

const sortedVariantAttributeCodes = (defs = []) =>
  [...defs]
    .filter((d) => d?.isVariant && d?.inputType === "select" && !isSizeCode(d?.code))
    .map((d) => String(d.code || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

module.exports = {
  generateVariantSku,
  sortedVariantAttributeCodes,
};
