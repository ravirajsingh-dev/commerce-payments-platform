import { formatPrice } from "@src/utils/productDetailHelpers";

export const CART_ISSUE_LABELS = {
  UNAVAILABLE: "This item is no longer available.",
  INSUFFICIENT_STOCK: "Not enough stock for the quantity in your cart.",
  PRICE_CHANGED: "Price has changed since you added this item.",
};

const SIZE_ATTRIBUTE_CODES = new Set(["size", "sizes"]);

const formatCartAttributeLabel = (key) =>
  String(key || "")
    .trim()
    .replace(/_/g, " ")
    .toUpperCase();

/** Title-case raw stored values (e.g. black_stripes → Black Stripes). */
const humanizeCartAttributeValue = (raw) => {
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

/** Resolve display label from catalog definitions when available. */
const formatCartAttributeValue = (key, value, meta = {}) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const code = String(key || "").trim().toLowerCase();
  const defs = meta?.variantAttributes || [];

  const attrDef = defs.find(
    (def) => String(def?.code || "").toLowerCase() === code,
  );
  if (attrDef?.options?.length) {
    const option = attrDef.options.find(
      (opt) =>
        String(opt?.value || "").toLowerCase() === raw.toLowerCase() ||
        String(opt?.label || "").toLowerCase() === raw.toLowerCase(),
    );
    if (option?.label) return String(option.label).trim();
  }

  const fromList = Array.isArray(meta?.variant?.attributeList)
    ? meta.variant.attributeList.find(
        (row) => String(row?.code || "").toLowerCase() === code,
      )
    : null;
  if (fromList?.valueLabel) return String(fromList.valueLabel).trim();

  return humanizeCartAttributeValue(raw);
};

const findAttributeDefinition = (code, meta = {}) => {
  const normalized = String(code || "").trim().toLowerCase();
  return (meta?.variantAttributes || []).find(
    (def) => String(def?.code || "").trim().toLowerCase() === normalized,
  );
};

const resolveAttributeLabel = (code, meta = {}) => {
  const def = findAttributeDefinition(code, meta);
  const fromName = String(def?.name || "").trim();
  if (fromName) {
    return fromName.replace(/_/g, " ").toUpperCase();
  }
  return formatCartAttributeLabel(code);
};

const getCartLineAttributeEntries = (attributesSnapshot = {}) =>
  Object.entries(attributesSnapshot || {}).filter(([key, value]) => {
    if (SIZE_ATTRIBUTE_CODES.has(String(key || "").trim().toLowerCase())) {
      return false;
    }
    return String(value || "").trim() !== "";
  });

/**
 * Catalog-ordered attribute rows for cart display (any count).
 * @returns {{ code: string, label: string, value: string }[]}
 */
export const getOrderedCartLineAttributes = (attributesSnapshot = {}, meta = {}) => {
  const entries = getCartLineAttributeEntries(attributesSnapshot);
  const defs = meta?.variantAttributes || [];

  const orderIndex = new Map();
  defs.forEach((def, index) => {
    const code = String(def?.code || "").trim().toLowerCase();
    if (code && !SIZE_ATTRIBUTE_CODES.has(code)) {
      orderIndex.set(code, index);
    }
  });

  return entries
    .map(([code, rawValue]) => ({
      code: String(code),
      label: resolveAttributeLabel(code, meta),
      value: formatCartAttributeValue(code, rawValue, meta),
    }))
    .sort((a, b) => {
      const codeA = a.code.toLowerCase();
      const codeB = b.code.toLowerCase();
      const rankA = orderIndex.has(codeA) ? orderIndex.get(codeA) : 9999;
      const rankB = orderIndex.has(codeB) ? orderIndex.get(codeB) : 9999;
      if (rankA !== rankB) return rankA - rankB;
      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    });
};

export const formatCartLineAttributes = (attributesSnapshot = {}, meta = {}) => {
  const rows = getOrderedCartLineAttributes(attributesSnapshot, meta);
  if (rows.length === 0) return "";
  return rows.map((row) => `${row.label}: ${row.value}`).join(" · ");
};

export const formatCartSizeLabel = (size) => {
  const value = String(size || "").trim();
  if (!value) return "";
  return value.toUpperCase();
};

export const getCartLineTitle = (meta) => {
  const variantName = String(meta?.variant?.name || "").trim();
  const productName = String(meta?.product?.name || "").trim();
  if (variantName) return variantName;
  if (productName) return productName;
  return "Product";
};

export const getCartLineImage = (meta) =>
  meta?.variant?.images?.[0]?.url || "";

export const getCartLineProductLink = (meta, item) => {
  const slug = String(meta?.product?.slug || "").trim();
  const variantId = String(item?.variantId || "").trim();
  if (!slug || !variantId) return null;
  return `/collection/${encodeURIComponent(slug)}/${encodeURIComponent(variantId)}`;
};

export const getCartLineMaxQty = (item) => {
  const stockCap = Number.isFinite(item?.availableStock)
    ? Math.max(0, Number(item.availableStock))
    : 99;
  return Math.min(99, stockCap > 0 ? stockCap : 99);
};

export { formatPrice };
