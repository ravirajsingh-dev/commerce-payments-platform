import { formatPrice } from "@src/utils/productDetailHelpers";

const roundMoney = (value) => Math.round(Number(value) * 100) / 100;

export const getVariantListPrice = (variant) =>
  Math.max(0, Number(variant?.price) || 0);

export const getVariantSalePrice = (variant) => {
  const listPrice = getVariantListPrice(variant);
  if (variant?.salePrice != null && Number.isFinite(Number(variant.salePrice))) {
    return Math.max(0, Number(variant.salePrice));
  }
  const type = String(variant?.discountType || "").toLowerCase();
  const val = Number(variant?.discountValue);
  if (!type || !Number.isFinite(val) || val <= 0) return listPrice;
  if (type === "percentage") {
    const pct = Math.min(100, Math.max(0, val));
    return roundMoney(listPrice * (1 - pct / 100));
  }
  if (type === "flat") {
    return roundMoney(Math.max(0, listPrice - val));
  }
  return listPrice;
};

export const variantHasDiscount = (variant) => {
  if (variant?.hasDiscount != null) return Boolean(variant.hasDiscount);
  const list = getVariantListPrice(variant);
  const sale = getVariantSalePrice(variant);
  return sale < list - 0.001;
};

export const getVariantDiscountBadge = (variant) => {
  if (!variantHasDiscount(variant)) return "";
  if (Number(variant?.discountPercent) > 0) {
    return `${variant.discountPercent}% OFF`;
  }
  const type = String(variant?.discountType || "").toLowerCase();
  const val = Number(variant?.discountValue);
  if (type === "percentage" && val > 0) return `${Math.round(val)}% OFF`;
  if (type === "flat" && val > 0) return `${formatPrice(val)} OFF`;
  const list = getVariantListPrice(variant);
  const sale = getVariantSalePrice(variant);
  if (list > 0) {
    return `${Math.round(((list - sale) / list) * 100)}% OFF`;
  }
  return "SALE";
};
