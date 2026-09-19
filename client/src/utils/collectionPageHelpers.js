const SIZE_CODES = new Set(["size", "sizes"]);

export const COLLECTION_SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "best-selling", label: "Best selling" },
  { value: "name-asc", label: "Alphabetically, A-Z" },
  { value: "name-desc", label: "Alphabetically, Z-A" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
  { value: "date-new", label: "Date, new to old" },
  { value: "date-old", label: "Date, old to new" },
];

export const COLLECTION_DEFAULT_SORT = COLLECTION_SORT_OPTIONS[0];

export const COLLECTION_ALL_TYPE_OPTION = { value: "all", label: "All" };

const COLOR_CODES = new Set(["color", "colour", "colors", "colours"]);

export const cleanCollectionDisplayName = (name) => {
  return String(name || "")
    .replace(/\s*\(\s*\d+\s+variants?\s*\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Only the "Type" select attribute — never Color or other variant axes. */
export const pickFilterAttribute = (variantAttributes = []) => {
  return (
    (variantAttributes || []).find((def) => {
      if (def?.inputType !== "select" || !def?.code) return false;
      const code = String(def.code).toLowerCase();
      const label = String(def.name || def.code).toLowerCase();
      if (SIZE_CODES.has(code) || COLOR_CODES.has(code)) return false;
      if (/color|colour/i.test(label)) return false;
      return /type/i.test(label) || code === "type";
    }) || null
  );
}

const getVariantAttributeValue = (variant, code) => {
  if (!variant || !code) return "";
  const normalized = String(code).toLowerCase();
  const fromList = Array.isArray(variant.attributeList)
    ? variant.attributeList.find(
        (row) => String(row?.code || "").toLowerCase() === normalized,
      )
    : null;
  if (fromList?.value != null && String(fromList.value).trim()) {
    return String(fromList.value).trim();
  }
  const attrs = variant.attributes;
  if (attrs && typeof attrs === "object") {
    for (const [key, value] of Object.entries(attrs)) {
      if (String(key).toLowerCase() === normalized) {
        return String(value || "").trim();
      }
    }
  }
  return "";
}

const getVariantAttributeLabel = (variant, code, attrDef) => {
  const raw = getVariantAttributeValue(variant, code);
  if (!raw) return "";
  const fromList = Array.isArray(variant.attributeList)
    ? variant.attributeList.find(
        (row) => String(row?.code || "").toLowerCase() === String(code).toLowerCase(),
      )
    : null;
  if (fromList?.valueLabel) return String(fromList.valueLabel).trim();
  const option = (attrDef?.options || []).find(
    (opt) =>
      String(opt?.value || "").toLowerCase() === raw.toLowerCase() ||
      String(opt?.label || "").toLowerCase() === raw.toLowerCase(),
  );
  return String(option?.label || raw).trim();
}

export const buildTypeFilterOptions = (entries, attrCode, attrDef) => {
  if (!attrCode) return [COLLECTION_ALL_TYPE_OPTION];
  const seen = new Map();
  for (const { variant } of entries) {
    const raw = getVariantAttributeValue(variant, attrCode);
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.set(key, {
      value: raw,
      label: getVariantAttributeLabel(variant, attrCode, attrDef) || raw,
    });
  }
  const values = Array.from(seen.values()).sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );
  return values.length > 1
    ? [COLLECTION_ALL_TYPE_OPTION, ...values]
    : [COLLECTION_ALL_TYPE_OPTION];
}

export const filterCollectionEntries = (entries, attrCode, filterValue) => {
  if (!attrCode || !filterValue || filterValue === "all") return entries;
  const target = String(filterValue).toLowerCase();
  return entries.filter(({ variant }) => {
    const raw = getVariantAttributeValue(variant, attrCode);
    return raw.toLowerCase() === target;
  });
}

const entryTitle = ({ product, variant }) => {
  const collectionName = String(product?.name || "").trim();
  return (
    String(variant?.name || "").trim() || collectionName || "Variant"
  );
}

const entryTimestamp = (variant) => {
  const raw = variant?.createdAt || variant?.updatedAt;
  const ts = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ts) ? ts : 0;
}

export const sortCollectionEntries = (entries, sortKey) => {
  const list = [...entries];
  const key = sortKey || "featured";

  if (key === "featured") return list;

  if (key === "best-selling") {
    return list.sort((a, b) => {
      const revenueA = Number(a.variant?.salesRevenue) || 0;
      const revenueB = Number(b.variant?.salesRevenue) || 0;
      if (revenueB !== revenueA) return revenueB - revenueA;
      const unitsA = Number(a.variant?.unitsSold) || 0;
      const unitsB = Number(b.variant?.unitsSold) || 0;
      if (unitsB !== unitsA) return unitsB - unitsA;
      return entryTitle(a).localeCompare(entryTitle(b), undefined, {
        sensitivity: "base",
      });
    });
  }

  if (key === "name-asc" || key === "name-desc") {
    const dir = key === "name-asc" ? 1 : -1;
    return list.sort(
      (a, b) =>
        dir *
        entryTitle(a).localeCompare(entryTitle(b), undefined, {
          sensitivity: "base",
        }),
    );
  }

  if (key === "price-asc" || key === "price-desc") {
    const dir = key === "price-asc" ? 1 : -1;
    return list.sort((a, b) => {
      const priceA =
        Number(a.variant?.salePrice ?? a.variant?.price) || 0;
      const priceB =
        Number(b.variant?.salePrice ?? b.variant?.price) || 0;
      if (priceA !== priceB) return dir * (priceA - priceB);
      return entryTitle(a).localeCompare(entryTitle(b), undefined, {
        sensitivity: "base",
      });
    });
  }

  if (key === "date-new" || key === "date-old") {
    const dir = key === "date-new" ? -1 : 1;
    return list.sort((a, b) => {
      const tsA = entryTimestamp(a.variant);
      const tsB = entryTimestamp(b.variant);
      if (tsA !== tsB) return dir * (tsA - tsB);
      return entryTitle(a).localeCompare(entryTitle(b), undefined, {
        sensitivity: "base",
      });
    });
  }

  return list;
}

export const findSelectOption = (options, value) => {
  if (!value) return null;
  return (
    (options || []).find(
      (opt) => String(opt.value).toLowerCase() === String(value).toLowerCase(),
    ) || null
  );
}

export const stripHtmlToText = (html = "") => {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
