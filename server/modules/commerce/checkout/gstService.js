const CommonSettings = require("../../../models/CommonSettings");

const roundMoney = (value) => Math.round(Number(value) * 100) / 100;

const normalizeGstin = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const isValidGstin = (gstin) => {
  if (!gstin) return true;
  if (gstin.length !== 15) return false;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin);
};

const getGstSettings = async () => {
  const settings = await CommonSettings.getOrCreateSettings();
  const gstRate = Math.max(0, Math.min(100, Number(settings.defaultGstRate) || 0));
  const gstin = normalizeGstin(settings.gstin);

  return {
    gstRate,
    gstin,
    gstEnabled: gstRate > 0,
  };
};

/**
 * GST on taxable amount (subtotal minus discount), exclusive pricing.
 * Shipping is not included in the GST base.
 */
const computeOrderGst = ({
  subtotal = 0,
  discountTotal = 0,
  shippingTotal = 0,
  gstRate = 0,
  gstin = "",
  lines = [],
} = {}) => {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  const safeDiscount = Math.max(0, Number(discountTotal) || 0);
  const safeShipping = Math.max(0, Number(shippingTotal) || 0);
  const rate = Math.max(0, Math.min(100, Number(gstRate) || 0));

  const taxableAmount = roundMoney(Math.max(0, safeSubtotal - safeDiscount));
  const gstAmount =
    rate > 0 && taxableAmount > 0
      ? roundMoney((taxableAmount * rate) / 100)
      : 0;
  const grandTotal = roundMoney(taxableAmount + gstAmount + safeShipping);

  const lineBreakdown = [];
  if (taxableAmount > 0 && Array.isArray(lines) && lines.length > 0) {
    let allocatedGst = 0;
    const lastIndex = lines.length - 1;

    lines.forEach((line, index) => {
      const lineTotal = Math.max(0, Number(line.lineTotal ?? line.lineTotalAtCurrentPrice) || 0);
      const lineTaxable =
        index === lastIndex
          ? roundMoney(taxableAmount - lineBreakdown.reduce((s, r) => s + r.taxableAmount, 0))
          : roundMoney((lineTotal / safeSubtotal) * taxableAmount);

      let lineGst = 0;
      if (gstAmount > 0) {
        lineGst =
          index === lastIndex
            ? roundMoney(gstAmount - allocatedGst)
            : roundMoney((lineTaxable / taxableAmount) * gstAmount);
        allocatedGst = roundMoney(allocatedGst + lineGst);
      }

      lineBreakdown.push({
        variantId: line.variantId,
        size: line.size || "",
        taxableAmount: lineTaxable,
        gstAmount: lineGst,
        lineTotal: lineTotal,
      });
    });
  }

  return {
    taxableAmount,
    gstAmount,
    gstRateSnapshot: rate,
    gstinSnapshot: normalizeGstin(gstin),
    grandTotal,
    lineBreakdown,
  };
};

const resolveCheckoutGst = async ({ subtotal, discountTotal, shippingTotal, lines }) => {
  const { gstRate, gstin } = await getGstSettings();
  return computeOrderGst({
    subtotal,
    discountTotal,
    shippingTotal,
    gstRate,
    gstin,
    lines,
  });
};

module.exports = {
  normalizeGstin,
  isValidGstin,
  getGstSettings,
  computeOrderGst,
  resolveCheckoutGst,
  roundMoney,
};
