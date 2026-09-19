import { isSizeCode, sortSizeOptionsForDisplay } from "@src/utils/productDetailHelpers";

/** Human-readable attribute + size summary for variant cards. */
export const buildVariantSubtitle = (variant) => {
  const attrs = Array.isArray(variant?.attributeList)
    ? variant.attributeList
    : [];
  const parts = attrs
    .filter((a) => a && !isSizeCode(a.code))
    .map((a) => {
      const v = String(a.valueLabel || a.value || "").trim();
      if (!v) return "";
      const label = String(a.label || a.code || "").trim();
      return label ? `${label}: ${v}` : v;
    })
    .filter(Boolean);
  const sizeRows = Array.isArray(variant?.sizes) ? variant.sizes : [];
  if (sizeRows.length > 0) {
    const labels = sortSizeOptionsForDisplay(sizeRows)
      .map((row) => String(row.label || row.value || "").trim())
      .filter(Boolean);
    if (labels.length) {
      parts.push(`Sizes: ${labels.join(", ")}`);
    }
  }
  return parts.join(" · ");
}
