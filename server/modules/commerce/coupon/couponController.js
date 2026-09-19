const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const couponService = require("./couponService");
const cartService = require("../cart/cartService");

const resolveUserId = (req) => req.user?.id || req.userObj?._id?.toString();

const handleServiceFailure = (res, result, fallbackMessage) =>
  response.errorResponse(
    res,
    result.errors || {},
    result.message || fallbackMessage,
    result.statusCode || 400,
  );

const validateCouponHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(res, {}, "Authentication required.", 401);
    }

    const { cart } = await cartService.getCart(userId);
    const subtotal = Number(cart?.subtotalAtCurrentPrices) || 0;

    if (!cart?.items?.length) {
      return response.errorResponse(
        res,
        [{ path: "cart", msg: "Cart is empty." }],
        "Add items to your cart before applying a coupon.",
        400,
      );
    }

    const result = await couponService.validateCouponForSubtotal(
      req.body.code,
      subtotal,
      userId,
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Invalid coupon.");
    }

    return response.successResponse(
      res,
      {
        coupon: {
          code: result.code,
          title: result.title,
          discountType: result.discountType,
          discountValue: result.discountValue,
          discountTotal: result.discountTotal,
          minOrderAmount: result.minOrderAmount,
        },
      },
      result.message,
    );
  } catch (err) {
    console.error("validateCouponHandler:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const applyCouponHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(res, {}, "Authentication required.", 401);
    }

    const result = await couponService.applyCouponToCart(userId, req.body.code);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to apply coupon.");
    }

    return response.successResponse(
      res,
      { cart: result.cart, coupon: result.coupon },
      result.message,
    );
  } catch (err) {
    console.error("applyCouponHandler:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const removeCouponHandler = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(res, {}, "Authentication required.", 401);
    }

    const result = await couponService.removeCouponFromCart(userId);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to remove coupon.");
    }

    return response.successResponse(res, { cart: result.cart }, result.message);
  } catch (err) {
    console.error("removeCouponHandler:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const listAvailableCouponsHandler = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(res, {}, "Authentication required.", 401);
    }

    const { cart } = await cartService.getCart(userId);
    const subtotal = Number(cart?.subtotalAtCurrentPrices) || 0;

    const result = await couponService.listAvailableCouponsForUser(userId, subtotal);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to load coupons.");
    }

    return response.successResponse(
      res,
      {
        coupons: result.coupons,
        subtotal: result.subtotal,
        appliedCode: result.appliedCode,
      },
      "Coupons fetched.",
    );
  } catch (err) {
    console.error("listAvailableCouponsHandler:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

module.exports = {
  listAvailableCouponsHandler,
  validateCouponHandler,
  applyCouponHandler,
  removeCouponHandler,
};
