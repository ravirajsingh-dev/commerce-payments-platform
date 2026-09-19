import { SIZE_RANK_GROUPS } from "@src/constants/productDetail";

const SIZE_ATTRIBUTE_CODES = new Set(["size", "sizes"]);

export const isSizeCode = (code) =>
  SIZE_ATTRIBUTE_CODES.has(String(code || "").toLowerCase());

/** Normalize size tokens for comparison (e.g. "X-L" → "xl", "2 XL" → "2xl"). */
const normalizeSizeToken = (raw) =>
  String(raw ?? "")
    .trim()
    .toLowerCase()
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

const canonicalSizeSortKey = (value) => {
  const k = normalizeSizeToken(value);
  if (!k) return [4000, ""];
  if (SIZE_RANK_LOOKUP.has(k)) {
    return [SIZE_RANK_LOOKUP.get(k), k];
  }
  if (/^\d{1,3}$/.test(k)) {
    return [1000 + parseInt(k, 10), k];
  }
  const toddler = k.match(/^(\d)t$/);
  if (toddler) {
    return [1500 + parseInt(toddler[1], 10), k];
  }
  return [3000, k];
};

export const sortSizeOptionsForDisplay = (rows = []) =>
  [...rows].sort((a, b) => {
    const [ra, ka] = canonicalSizeSortKey(a?.value);
    const [rb, kb] = canonicalSizeSortKey(b?.value);
    if (ra !== rb) return ra - rb;
    return ka.localeCompare(kb);
  });

export const formatPrice = (price) => {
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) return "";
  try {
    return numeric.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  } catch {
    return `₹${numeric.toFixed(2)}`;
  }
};

export const hasSizeChartData = (chart) =>
  Boolean(
    chart &&
      Array.isArray(chart.sizes) &&
      chart.sizes.length > 0 &&
      Array.isArray(chart.rows) &&
      chart.rows.length > 0,
  );

/**
 * One row per catalog variant attribute (excluding size). Shows only this variant's value.
 */
export const buildAttributeMatrix = (
  variantAttributes = [],
  selectedAttrs = {},
) => {
  const definitions = (variantAttributes || [])
    .filter((def) => !isSizeCode(def?.code))
    .map((def) => ({
      code: String(def?.code || ""),
      name: def?.name || def?.code || "",
      options: Array.isArray(def?.options) ? def.options : [],
    }));

  return definitions.map((def) => {
    const raw = String(selectedAttrs?.[def.code] ?? "").trim();
    if (!raw) {
      return { ...def, options: [], selectedValue: "", inStock: false };
    }
    const optionMeta = def.options.find(
      (opt) =>
        String(opt.value) === raw ||
        String(opt.value).toLowerCase() === raw.toLowerCase(),
    );
    const label = optionMeta?.label || raw;
    return {
      ...def,
      options: [
        {
          value: raw,
          label,
          inStock: true,
          hasVariant: true,
        },
      ],
      selectedValue: raw,
    };
  });
};

/**
 * Size picker options for the active variant.
 */
export const buildSizeOptions = (variant) => {
  if (!variant) return [];
  if (Array.isArray(variant.sizes) && variant.sizes.length > 0) {
    const rows = variant.sizes.map((row) => ({
      value: String(row?.value || "").toLowerCase(),
      label:
        String(row?.label || row?.value || "").trim() ||
        String(row?.value || "").toUpperCase(),
      sku: String(row?.sku || ""),
      stock: Math.max(0, Number(row?.stock) || 0),
      description: String(row?.description || "").trim(),
    }));
    return sortSizeOptionsForDisplay(rows);
  }
  const legacyEntry = Object.entries(variant.attributes || {}).find(([code]) =>
    isSizeCode(code),
  );
  if (!legacyEntry) return [];
  const [, legacyValue] = legacyEntry;
  return sortSizeOptionsForDisplay([
    {
      value: String(legacyValue || "").toLowerCase(),
      label: String(legacyValue || "").toUpperCase(),
      sku: "",
      stock: Math.max(0, Number(variant?.stock) || 0),
      description: "",
    },
  ]);
};
