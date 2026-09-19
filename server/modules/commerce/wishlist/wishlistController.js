const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const wishlistService = require("./wishlistService");

const resolveUserId = (req) => req.user?.id || req.userObj?._id?.toString();

const handleServiceFailure = (res, result, fallbackMessage) =>
  response.errorResponse(
    res,
    result.errors || {},
    result.message || fallbackMessage,
    result.statusCode || 400,
  );

const getWishlistHandler = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(res, {}, "Authentication required.", 401);
    }

    const result = await wishlistService.getWishlist(userId);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to load wishlist.");
    }

    return response.successResponse(
      res,
      { wishlist: result.wishlist },
      "Wishlist fetched.",
    );
  } catch (err) {
    console.error("getWishlistHandler:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const addWishlistItemHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(res, {}, "Authentication required.", 401);
    }

    const result = await wishlistService.addWishlistItem(userId, req.body.variantId);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to add to wishlist.");
    }

    return response.successResponse(
      res,
      { wishlist: result.wishlist },
      result.message,
      201,
    );
  } catch (err) {
    console.error("addWishlistItemHandler:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const removeWishlistItemHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(res, {}, "Authentication required.", 401);
    }

    const result = await wishlistService.removeWishlistItem(
      userId,
      req.params.variantId,
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to remove from wishlist.");
    }

    return response.successResponse(
      res,
      { wishlist: result.wishlist },
      result.message,
    );
  } catch (err) {
    console.error("removeWishlistItemHandler:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const toggleWishlistItemHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(res, {}, "Authentication required.", 401);
    }

    const result = await wishlistService.toggleWishlistItem(
      userId,
      req.params.variantId,
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to update wishlist.");
    }

    return response.successResponse(
      res,
      { wishlist: result.wishlist },
      result.message,
    );
  } catch (err) {
    console.error("toggleWishlistItemHandler:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

module.exports = {
  getWishlistHandler,
  addWishlistItemHandler,
  removeWishlistItemHandler,
  toggleWishlistItemHandler,
};
