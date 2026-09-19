const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const reviewService = require("./reviewService");

const resolveUserId = (req) => req.user?.id || req.userObj?._id?.toString();

const handleServiceFailure = (res, result, fallbackMessage) =>
  response.errorResponse(
    res,
    result.errors || {},
    result.message || fallbackMessage,
    result.statusCode || 400,
  );

const listVariantReviewsHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await reviewService.listApprovedReviewsForVariant(
      req.params.variantId,
      req.query,
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to load reviews.");
    }

    return response.successResponse(
      res,
      {
        reviews: result.reviews,
        summary: result.summary,
        pagination: result.pagination,
      },
      "Reviews fetched.",
    );
  } catch (err) {
    console.error("listVariantReviewsHandler:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const getVariantReviewContextHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    const result = await reviewService.getUserReviewContext(
      userId,
      req.params.variantId,
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to load review context.");
    }

    return response.successResponse(
      res,
      {
        canReview: result.canReview,
        review: result.review,
      },
      "Review context fetched.",
    );
  } catch (err) {
    console.error("getVariantReviewContextHandler:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const submitReviewHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(res, {}, "Authentication required.", 401);
    }

    const result = await reviewService.submitReview(userId, req.body);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to submit review.");
    }

    return response.successResponse(
      res,
      { review: result.review },
      result.message,
      201,
    );
  } catch (err) {
    console.error("submitReviewHandler:", err);
    if (err?.code === 11000) {
      return response.errorResponse(
        res,
        [{ path: "productVariantId", msg: "You have already reviewed this product." }],
        "Duplicate review.",
        409,
      );
    }
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const getOrderReviewContextHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return response.errorResponse(res, {}, "Authentication required.", 401);
    }

    const result = await reviewService.getOrderReviewContext(
      userId,
      req.params.orderNo,
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to load order reviews.");
    }

    return response.successResponse(
      res,
      {
        canReviewOrder: result.canReviewOrder,
        items: result.items,
      },
      "Order review context fetched.",
    );
  } catch (err) {
    console.error("getOrderReviewContextHandler:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

module.exports = {
  listVariantReviewsHandler,
  getVariantReviewContextHandler,
  getOrderReviewContextHandler,
  submitReviewHandler,
};
