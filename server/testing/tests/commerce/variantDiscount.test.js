const {
  normalizeVariantDiscount,
  computeVariantSalePrice,
  getVariantEffectivePrice,
} = require("../../../utils/variantPricing");

describe("variantPricing", () => {
  test("no discount returns list price", () => {
    expect(computeVariantSalePrice(1000, null, 0)).toBe(1000);
    expect(getVariantEffectivePrice({ price: 500 })).toBe(500);
  });

  test("percentage discount", () => {
    const result = normalizeVariantDiscount({
      price: 1000,
      discountType: "percentage",
      discountValue: 20,
    });
    expect(result.salePrice).toBe(800);
    expect(result.hasDiscount).toBe(true);
  });

  test("flat discount capped at list price", () => {
    const result = normalizeVariantDiscount({
      price: 500,
      discountType: "flat",
      discountValue: 800,
    });
    expect(result.salePrice).toBe(0);
    expect(result.discountValue).toBe(500);
  });

  test("flat discount partial", () => {
    expect(computeVariantSalePrice(1200, "flat", 200)).toBe(1000);
  });
});
