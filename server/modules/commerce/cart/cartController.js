const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const service = require("./cartService");
const { mergeGuestCartIntoUser } = require("./guestCartMerge");
const { readGuestSessionFromRequest } = require("./cartOwner");
const { attachGuestSessionCookie } = require("./cartAccess");

const handleServiceFailure = (res, result, fallbackMessage) =>
  response.errorResponse(
    res,
    result.errors || {},
    result.message || fallbackMessage,
    result.statusCode || 400,
  );

const syncGuestSessionFromCart = (res, cart) => {
  if (cart?.sessionId) {
    attachGuestSessionCookie(res, cart.sessionId);
  }
};

const getCart = async (req, res) => {
  try {
    const result = await service.getCart(req.cartOwner);
    if (result.cart?.sessionId) {
      syncGuestSessionFromCart(res, result.cart);
    }
    return response.successResponse(
      res,
      { cart: result.cart },
      "Cart fetched.",
    );
  } catch (err) {
    console.error("getCart:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const addCartItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.addCartItem(req.cartOwner, req.body);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to add item to cart.");
    }

    syncGuestSessionFromCart(res, result.cart);

    return response.successResponse(
      res,
      { cart: result.cart },
      "Item added to cart.",
      200,
    );
  } catch (err) {
    console.error("addCartItem:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const updateCartItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.updateCartItem(req.cartOwner, req.body);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to update cart item.");
    }

    syncGuestSessionFromCart(res, result.cart);

    return response.successResponse(
      res,
      { cart: result.cart },
      "Cart item updated.",
    );
  } catch (err) {
    console.error("updateCartItem:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const removeCartItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.removeCartItem(
      req.cartOwner,
      req.params.variantId,
      req.query.size,
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to remove cart item.");
    }

    syncGuestSessionFromCart(res, result.cart);

    return response.successResponse(
      res,
      { cart: result.cart },
      "Cart item removed.",
    );
  } catch (err) {
    console.error("removeCartItem:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const mergeGuestCart = async (req, res) => {
  try {
    const userId = req.user?.id || req.userObj?._id?.toString();
    if (!userId) {
      return response.errorResponse(
        res,
        {},
        "Authentication required.",
        401,
      );
    }

    const guestSessionId = readGuestSessionFromRequest(req);
    const result = await mergeGuestCartIntoUser(userId, guestSessionId);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to merge guest cart.");
    }

    return response.successResponse(
      res,
      { cart: result.cart, merged: Boolean(result.merged) },
      result.merged ? "Guest cart merged." : "Cart loaded.",
    );
  } catch (err) {
    console.error("mergeGuestCart:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  mergeGuestCart,
};
