const mongoose = require("mongoose");
const Coupon = require("../../../models/Coupon");
const CouponUsage = require("../../../models/CouponUsage");
const Cart = require("../../../models/Cart");

const COUPON_ERROR = {
  INVALID_CODE: "INVALID_COUPON_CODE",
  NOT_FOUND: "COUPON_NOT_FOUND",
  INACTIVE: "COUPON_INACTIVE",
  NOT_STARTED: "COUPON_NOT_STARTED",
  EXPIRED: "COUPON_EXPIRED",
  MIN_ORDER_NOT_MET: "COUPON_MIN_ORDER_NOT_MET",
  USAGE_LIMIT_REACHED: "COUPON_USAGE_LIMIT_REACHED",
  USER_LIMIT_REACHED: "COUPON_USER_LIMIT_REACHED",
  EXHAUSTED: "COUPON_EXHAUSTED",
  EMPTY_CART: "EMPTY_CART",
};

const ACTIVE_STATUS = 1;

const normalizeCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const roundMoney = (value) => Math.round(Number(value) * 100) / 100;

const countUserCouponUsage = async (couponId, userId) => {
  if (!couponId || !userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return 0;
  }
  return CouponUsage.countDocuments({
    couponId: new mongoose.Types.ObjectId(couponId),
    userId: new mongoose.Types.ObjectId(userId),
  });
};

const calculateDiscountAmount = (coupon, subtotal) => {
  const base = Math.max(Number(subtotal) || 0, 0);
  if (!coupon || base <= 0) return 0;

  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = (base * Number(coupon.discountValue)) / 100;
    const cap = Number(coupon.maxDiscountAmount) || 0;
    if (cap > 0) {
      discount = Math.min(discount, cap);
    }
  } else {
    discount = Number(coupon.discountValue) || 0;
  }

  return roundMoney(Math.min(discount, base));
};

const buildActionHint = (error, amountShort) => {
  if (error === COUPON_ERROR.MIN_ORDER_NOT_MET && amountShort > 0) {
    return `Add ₹${amountShort.toLocaleString("en-IN")} more to avail this offer`;
  }
  if (error === COUPON_ERROR.USER_LIMIT_REACHED) {
    return "You have used this coupon the maximum number of times";
  }
  if (error === COUPON_ERROR.USAGE_LIMIT_REACHED) {
    return "This coupon has reached its total usage limit";
  }
  if (error === COUPON_ERROR.NOT_STARTED) {
    return "This coupon is not active yet";
  }
  if (error === COUPON_ERROR.EXPIRED) {
    return "This coupon has expired";
  }
  if (error === COUPON_ERROR.INACTIVE) {
    return "This coupon is not available";
  }
  return "";
};

const evaluateCoupon = (coupon, { subtotal, now = new Date(), userUsageCount = 0 } = {}) => {
  if (!coupon) {
    return {
      ok: false,
      error: COUPON_ERROR.NOT_FOUND,
      message: "Coupon not found.",
    };
  }

  if (Number(coupon.status) !== ACTIVE_STATUS) {
    return {
      ok: false,
      error: COUPON_ERROR.INACTIVE,
      message: "This coupon is not active.",
    };
  }

  const current = now instanceof Date ? now : new Date(now);
  if (coupon.startsAt && current < new Date(coupon.startsAt)) {
    return {
      ok: false,
      error: COUPON_ERROR.NOT_STARTED,
      message: "This coupon is not valid yet.",
    };
  }

  if (coupon.endsAt && current > new Date(coupon.endsAt)) {
    return {
      ok: false,
      error: COUPON_ERROR.EXPIRED,
      message: "This coupon has expired.",
    };
  }

  const minOrder = Number(coupon.minOrderAmount) || 0;
  const cartSubtotal = Math.max(Number(subtotal) || 0, 0);
  if (cartSubtotal < minOrder) {
    const amountShort = roundMoney(minOrder - cartSubtotal);
    return {
      ok: false,
      error: COUPON_ERROR.MIN_ORDER_NOT_MET,
      message: `Minimum order amount is ₹${minOrder}.`,
      amountShort,
    };
  }

  const usageLimit = Number(coupon.usageLimit) || 0;
  const usedCount = Number(coupon.usedCount) || 0;
  if (usageLimit > 0 && usedCount >= usageLimit) {
    return {
      ok: false,
      error: COUPON_ERROR.USAGE_LIMIT_REACHED,
      message: "This coupon has reached its usage limit.",
    };
  }

  const perUserLimit = Number(coupon.usageLimitPerUser) || 0;
  const userUsed = Number(userUsageCount) || 0;
  if (perUserLimit > 0 && userUsed >= perUserLimit) {
    return {
      ok: false,
      error: COUPON_ERROR.USER_LIMIT_REACHED,
      message: "You have reached the usage limit for this coupon.",
    };
  }

  const discountTotal = calculateDiscountAmount(coupon, cartSubtotal);

  return {
    ok: true,
    coupon,
    discountTotal,
    message: "Coupon applied.",
  };
};

const evaluateCouponForUser = async (coupon, { subtotal, userId, now = new Date() } = {}) => {
  let userUsageCount = 0;
  if (userId && coupon?._id) {
    userUsageCount = await countUserCouponUsage(coupon._id, userId);
  }
  return evaluateCoupon(coupon, { subtotal, now, userUsageCount });
};

const findCouponByCode = async (code) => {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return Coupon.findOne({ code: normalized }).lean();
};

const validateCouponForSubtotal = async (code, subtotal, userId) => {
  const normalized = normalizeCode(code);
  if (!normalized || normalized.length < 3) {
    return {
      ok: false,
      error: COUPON_ERROR.INVALID_CODE,
      message: "Enter a valid coupon code.",
      errors: [{ path: "code", msg: "Enter a valid coupon code." }],
      statusCode: 400,
    };
  }

  const coupon = await findCouponByCode(normalized);
  const evaluation = await evaluateCouponForUser(coupon, { subtotal, userId });

  if (!evaluation.ok) {
    return {
      ok: false,
      error: evaluation.error,
      message: evaluation.message,
      errors: [{ path: "code", msg: evaluation.message }],
      statusCode: 400,
    };
  }

  return {
    ok: true,
    code: normalized,
    title: evaluation.coupon.title,
    discountType: evaluation.coupon.discountType,
    discountValue: evaluation.coupon.discountValue,
    discountTotal: evaluation.discountTotal,
    minOrderAmount: evaluation.coupon.minOrderAmount,
    message: evaluation.message,
  };
};

const resolveAppliedCoupon = async (couponCode, subtotal, userId) => {
  const normalized = normalizeCode(couponCode);
  if (!normalized) {
    return {
      couponCode: "",
      couponTitle: "",
      discountTotal: 0,
      couponValid: true,
      couponMessage: "",
    };
  }

  const coupon = await findCouponByCode(normalized);
  const evaluation = await evaluateCouponForUser(coupon, { subtotal, userId });

  if (!evaluation.ok) {
    return {
      couponCode: normalized,
      couponTitle: coupon?.title || "",
      discountTotal: 0,
      couponValid: false,
      couponMessage: evaluation.message,
    };
  }

  return {
    couponCode: normalized,
    couponTitle: evaluation.coupon.title,
    discountTotal: evaluation.discountTotal,
    couponValid: true,
    couponMessage: "",
  };
};

const attachCouponTotals = async (cartResponse) => {
  if (!cartResponse) return cartResponse;

  const subtotalForCoupon =
    Number(cartResponse.subtotalAtCurrentPrices ?? cartResponse.subtotal) || 0;
  const couponFields = await resolveAppliedCoupon(
    cartResponse.couponCode,
    subtotalForCoupon,
    cartResponse.userId,
  );

  const discountTotal = couponFields.couponValid ? couponFields.discountTotal : 0;
  const grandTotal = Math.max(0, subtotalForCoupon - discountTotal);

  return {
    ...cartResponse,
    ...couponFields,
    discountTotal,
    grandTotal,
  };
};

const findUserCart = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  return Cart.findOne({ userId: new mongoose.Types.ObjectId(userId) });
};

const buildCouponOffer = async (coupon, { subtotal, userId, appliedCode, now = new Date() }) => {
  const userUsageCount = userId ? await countUserCouponUsage(coupon._id, userId) : 0;
  const evaluation = evaluateCoupon(coupon, { subtotal, now, userUsageCount });
  const cartSubtotal = Math.max(Number(subtotal) || 0, 0);
  const minOrder = Number(coupon.minOrderAmount) || 0;
  const amountShort =
    evaluation.amountShort ?? (minOrder > cartSubtotal ? roundMoney(minOrder - cartSubtotal) : 0);

  const normalizedApplied = normalizeCode(appliedCode);
  const isApplied = normalizedApplied === coupon.code;

  let status = "locked";
  let canApply = false;

  if (isApplied) {
    status = evaluation.ok ? "applied" : "applied_invalid";
  } else if (evaluation.ok) {
    status = "available";
    canApply = true;
  }

  const perUserLimit = Number(coupon.usageLimitPerUser) || 0;
  const usageLimit = Number(coupon.usageLimit) || 0;
  const usedCount = Number(coupon.usedCount) || 0;

  return {
    _id: String(coupon._id),
    code: coupon.code,
    title: coupon.title,
    termsAndConditions: coupon.termsAndConditions || "",
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minOrderAmount: coupon.minOrderAmount ?? 0,
    maxDiscountAmount: coupon.maxDiscountAmount ?? 0,
    startsAt: coupon.startsAt || null,
    endsAt: coupon.endsAt || null,
    discountPreview: calculateDiscountAmount(coupon, cartSubtotal),
    status,
    canApply,
    message: evaluation.ok ? evaluation.message : evaluation.message,
    actionHint: evaluation.ok ? "" : buildActionHint(evaluation.error, amountShort),
    amountShort,
    userUsageCount,
    usageLimitPerUser: perUserLimit,
    userUsesRemaining:
      perUserLimit > 0 ? Math.max(0, perUserLimit - userUsageCount) : null,
    globalUsesRemaining: usageLimit > 0 ? Math.max(0, usageLimit - usedCount) : null,
    usageLimit,
    usedCount,
  };
};

const listAvailableCouponsForUser = async (userId, subtotal = 0) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return {
      ok: false,
      message: "Authentication required.",
      statusCode: 401,
    };
  }

  const now = new Date();
  const coupons = await Coupon.find({
    status: ACTIVE_STATUS,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  const cart = await findUserCart(userId);
  const appliedCode = cart?.couponCode || "";

  const offers = await Promise.all(
    coupons.map((coupon) =>
      buildCouponOffer(coupon, { subtotal, userId, appliedCode, now }),
    ),
  );

  offers.sort((a, b) => {
    if (a.status === "applied") return -1;
    if (b.status === "applied") return 1;
    if (a.canApply !== b.canApply) return a.canApply ? -1 : 1;
    return (b.discountPreview || 0) - (a.discountPreview || 0);
  });

  return {
    ok: true,
    coupons: offers,
    subtotal: Math.max(Number(subtotal) || 0, 0),
    appliedCode: normalizeCode(appliedCode),
  };
};

const applyCouponToCart = async (userId, code) => {
  const cart = await findUserCart(userId);
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    return {
      ok: false,
      error: COUPON_ERROR.EMPTY_CART,
      message: "Add items to your cart before applying a coupon.",
      errors: [{ path: "cart", msg: "Cart is empty." }],
      statusCode: 400,
    };
  }

  const { finalizeCartResponse, buildCartResponse } = require("../cart/cartService");
  const baseCart = await buildCartResponse(cart, userId);
  const subtotal = Number(baseCart.subtotalAtCurrentPrices) || 0;

  const validation = await validateCouponForSubtotal(code, subtotal, userId);
  if (!validation.ok) {
    return validation;
  }

  cart.couponCode = validation.code;
  await cart.save();

  return {
    ok: true,
    cart: await finalizeCartResponse(cart, userId),
    coupon: {
      code: validation.code,
      title: validation.title,
      discountTotal: validation.discountTotal,
    },
    message: validation.message,
  };
};

const removeCouponFromCart = async (userId) => {
  const cart = await findUserCart(userId);
  const { finalizeCartResponse } = require("../cart/cartService");

  if (!cart) {
    return {
      ok: true,
      cart: await finalizeCartResponse(null, userId),
      message: "Coupon removed.",
    };
  }

  cart.couponCode = "";
  await cart.save();

  return {
    ok: true,
    cart: await finalizeCartResponse(cart, userId),
    message: "Coupon removed.",
  };
};

const consumeCouponForOrder = async ({
  session,
  userId,
  couponCode,
  subtotal,
  orderId,
  orderNo,
  discountTotal,
}) => {
  const normalized = normalizeCode(couponCode);
  if (!normalized || !(Number(discountTotal) > 0)) {
    return { ok: true };
  }

  const coupon = await Coupon.findOne({ code: normalized }).session(session || null);
  const evaluation = await evaluateCouponForUser(coupon, { subtotal, userId });
  if (!evaluation.ok) {
    const err = new Error(evaluation.message);
    err.code = evaluation.error;
    throw err;
  }

  const usageFilter = {
    _id: coupon._id,
    status: ACTIVE_STATUS,
  };
  if (Number(coupon.usageLimit) > 0) {
    usageFilter.usedCount = { $lt: Number(coupon.usageLimit) };
  }

  const updated = await Coupon.findOneAndUpdate(
    usageFilter,
    { $inc: { usedCount: 1 } },
    { returnDocument: "after", session: session || undefined },
  );

  if (!updated) {
    const err = new Error("Coupon is no longer available.");
    err.code = COUPON_ERROR.EXHAUSTED;
    throw err;
  }

  await CouponUsage.create(
    [
      {
        couponId: coupon._id,
        userId: new mongoose.Types.ObjectId(userId),
        orderId,
        orderNo,
        code: normalized,
        discountAmount: roundMoney(discountTotal),
      },
    ],
    session ? { session } : {},
  );

  return { ok: true, couponId: coupon._id };
};

module.exports = {
  COUPON_ERROR,
  normalizeCode,
  countUserCouponUsage,
  calculateDiscountAmount,
  evaluateCoupon,
  evaluateCouponForUser,
  validateCouponForSubtotal,
  resolveAppliedCoupon,
  attachCouponTotals,
  listAvailableCouponsForUser,
  applyCouponToCart,
  removeCouponFromCart,
  consumeCouponForOrder,
};
