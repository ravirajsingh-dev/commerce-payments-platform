const VALID_DISCOUNT_TYPES = new Set(["percentage", "flat"]);

const roundMoney = (value) => Math.round(Number(value) * 100) / 100;

/**
 * Normalizes variant discount fields and computes sale price from list price.
 * When discount is absent or invalid, salePrice equals list price.
 */
const normalizeVariantDiscount = ({ discountType, discountValue, price } = {}) => {
  const listPrice = Math.max(0, Number(price) || 0);
  const typeRaw = String(discountType || "").trim().toLowerCase();
  const type = VALID_DISCOUNT_TYPES.has(typeRaw) ? typeRaw : null;
  const val = Number(discountValue);

  if (!type || !Number.isFinite(val) || val <= 0) {
    return {
      discountType: null,
      discountValue: 0,
      salePrice: listPrice,
      hasDiscount: false,
    };
  }

  if (type === "percentage") {
    const pct = Math.min(100, Math.max(0, val));
    const salePrice = roundMoney(listPrice * (1 - pct / 100));
    return {
      discountType: "percentage",
      discountValue: pct,
      salePrice,
      hasDiscount: salePrice < listPrice - 0.001,
    };
  }

  const flat = Math.min(listPrice, Math.max(0, val));
  const salePrice = roundMoney(Math.max(0, listPrice - flat));
  return {
    discountType: "flat",
    discountValue: flat,
    salePrice,
    hasDiscount: salePrice < listPrice - 0.001,
  };
};

const computeVariantSalePrice = (price, discountType, discountValue) =>
  normalizeVariantDiscount({ discountType, discountValue, price }).salePrice;

const getVariantEffectivePrice = (variant) => {
  if (!variant) return 0;
  if (variant.salePrice != null && Number.isFinite(Number(variant.salePrice))) {
    return Number(variant.salePrice);
  }
  return computeVariantSalePrice(
    variant.price,
    variant.discountType,
    variant.discountValue,
  );
};

const enrichVariantPricing = (variant) => {
  if (!variant || typeof variant !== "object") return variant;
  const listPrice = Number(variant.price) || 0;
  const normalized = normalizeVariantDiscount({
    discountType: variant.discountType,
    discountValue: variant.discountValue,
    price: listPrice,
  });
  const next = { ...variant };
  next.discountType = normalized.discountType;
  next.discountValue = normalized.discountValue;
  next.salePrice = normalized.salePrice;
  next.hasDiscount = normalized.hasDiscount;
  if (normalized.hasDiscount && listPrice > 0) {
    next.discountPercent = Math.round(
      ((listPrice - normalized.salePrice) / listPrice) * 100,
    );
  } else {
    next.discountPercent = 0;
  }
  return next;
};

module.exports = {
  VALID_DISCOUNT_TYPES,
  normalizeVariantDiscount,
  computeVariantSalePrice,
  getVariantEffectivePrice,
  enrichVariantPricing,
};
