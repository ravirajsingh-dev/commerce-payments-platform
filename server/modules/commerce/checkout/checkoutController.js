const response = require("../../../config/response");
const { ERROR_CODES } = require("../../../shared/contracts/apiContract");
const {
  resolveCheckoutAddressSnapshot,
} = require("../address/checkoutAddressService");
const { previewCheckout } = require("./checkoutPreviewService");
const { placeOrder } = require("./placeOrderService");

const resolveUserId = (req) => req.user?.id || req.userObj?._id?.toString();

/**
 * POST /api/checkout/validate-address
 * Validates inline shipping fields (guest or logged-in) or resolves a saved UserAddress.
 */
const validateCheckoutAddressHandler = async (req, res) => {
  try {
    const result = await resolveCheckoutAddressSnapshot({
      userId: resolveUserId(req),
      body: req.body,
    });

    if (!result.valid) {
      const statusCode = result.code === "UNAUTHORIZED" ? 401 : 400;
      const options =
        result.code === "UNAUTHORIZED"
          ? { code: ERROR_CODES.UNAUTHORIZED }
          : undefined;

      return response.errorResponse(
        res,
        result.errors,
        result.code === "UNAUTHORIZED"
          ? "Authentication required."
          : "Validation Error",
        statusCode,
        false,
        options,
      );
    }

    return response.successResponse(
      res,
      { addressSnapshot: result.snapshot },
      "Address is valid.",
    );
  } catch (err) {
    console.error("validateCheckoutAddress:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const previewCheckoutHandler = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(
        res,
        {},
        "Authentication required.",
        401,
      );
    }

    const result = await previewCheckout(userId);
    if (!result.ok) {
      return response.errorResponse(
        res,
        result.errors || {},
        result.message || "Unable to preview checkout.",
        result.statusCode || 400,
      );
    }

    return response.successResponse(
      res,
      { preview: result.preview },
      "Checkout preview ready.",
    );
  } catch (err) {
    console.error("previewCheckout:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const placeOrderHandler = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(
        res,
        {},
        "Authentication required.",
        401,
      );
    }

    const result = await placeOrder(userId, req.body);
    if (!result.ok) {
      return response.errorResponse(
        res,
        result.errors || {},
        result.message || "Unable to place order.",
        result.statusCode || 400,
      );
    }

    return response.successResponse(
      res,
      { order: result.order },
      "Order placed successfully.",
      201,
    );
  } catch (err) {
    console.error("placeOrder:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

module.exports = {
  validateCheckoutAddressHandler,
  previewCheckoutHandler,
  placeOrderHandler,
};
