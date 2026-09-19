const CommonSettings = require("../../../models/CommonSettings");
const { getCart, CART_ITEM_ISSUE } = require("../cart/cartService");
const { resolveAppliedCoupon } = require("../coupon/couponService");
const { resolveCheckoutGst } = require("./gstService");

const CHECKOUT_PREVIEW_ERROR = {
  EMPTY_CART: "EMPTY_CART",
  CART_NOT_FOUND: "CART_NOT_FOUND",
};

const resolveFlatShippingTotal = async () => {
  const settings = await CommonSettings.getOrCreateSettings();
  const fee = Number(settings?.flatShippingFee);
  if (!Number.isFinite(fee) || fee < 0) {
    return 0;
  }
  return fee;
};

const mapPreviewLine = (item) => ({
  productId: item.productId,
  variantId: item.variantId,
  size: item.size,
  quantity: item.quantity,
  unitPrice: item.currentUnitPrice,
  lineTotal: item.lineTotalAtCurrentPrice,
  unitPriceSnapshot: item.unitPriceSnapshot,
  lineTotalSnapshot: item.lineTotal,
  priceChanged: item.priceChanged,
  availableStock: item.availableStock,
  isAvailable: item.isAvailable,
  stockSufficient: item.stockSufficient,
  issues: item.issues,
});

/**
 * Builds checkout preview from the user's cart (live stock + current prices).
 */
const previewCheckout = async (userId) => {
  const { cart } = await getCart(userId);

  if (!Array.isArray(cart.items) || cart.items.length === 0) {
    return {
      ok: false,
      code: CHECKOUT_PREVIEW_ERROR.EMPTY_CART,
      message: "Cart is empty",
      errors: [{ path: "cart", msg: "Add items to your cart before checkout." }],
      statusCode: 400,
    };
  }

  const shippingTotal = await resolveFlatShippingTotal();
  const subtotal = cart.subtotalAtCurrentPrices;
  const couponState = await resolveAppliedCoupon(cart.couponCode, subtotal, userId);
  const discountTotal = couponState.couponValid ? couponState.discountTotal : 0;
  const gst = await resolveCheckoutGst({
    subtotal,
    discountTotal,
    shippingTotal,
    lines: cart.items,
  });
  const hasIssues = Boolean(cart.hasIssues);
  const couponBlocksCheckout =
    Boolean(couponState.couponCode) && !couponState.couponValid;
  const canCheckout = !hasIssues && !couponBlocksCheckout;

  const blockingIssues = [];
  if (hasIssues) {
    const unavailable = cart.items.some((row) =>
      row.issues.includes(CART_ITEM_ISSUE.UNAVAILABLE),
    );
    const insufficient = cart.items.some((row) =>
      row.issues.includes(CART_ITEM_ISSUE.INSUFFICIENT_STOCK),
    );
    if (unavailable) {
      blockingIssues.push("UNAVAILABLE_ITEMS");
    }
    if (insufficient) {
      blockingIssues.push("INSUFFICIENT_STOCK");
    }
    if (cart.items.some((row) => row.issues.includes(CART_ITEM_ISSUE.PRICE_CHANGED))) {
      blockingIssues.push("PRICE_CHANGED");
    }
  }

  if (couponBlocksCheckout) {
    blockingIssues.push("COUPON_INVALID");
  }

  return {
    ok: true,
    preview: {
      items: cart.items.map(mapPreviewLine),
      itemCount: cart.itemCount,
      amounts: {
        items: subtotal,
        discount: discountTotal,
        shipping: shippingTotal,
        gst: gst.gstAmount,
        total: gst.grandTotal,
      },
      subtotalSnapshot: cart.subtotal,
      gstLineBreakdown: gst.lineBreakdown,
      hasIssues: hasIssues || couponBlocksCheckout,
      canCheckout,
      blockingIssues,
      couponCode: couponState.couponCode || "",
      couponTitle: couponState.couponTitle || "",
      couponValid: couponState.couponValid,
      couponMessage: couponState.couponMessage || "",
    },
  };
};

module.exports = {
  CHECKOUT_PREVIEW_ERROR,
  resolveFlatShippingTotal,
  previewCheckout,
};
