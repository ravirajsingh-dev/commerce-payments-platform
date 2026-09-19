const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const service = require("./reviewAdminService");

const handleServiceFailure = (res, result, fallbackMessage) =>
  response.errorResponse(
    res,
    result.errors || {},
    result.message || fallbackMessage,
    result.statusCode || 400,
  );

const listAdminReviews = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.listAdminReviews(req.query);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to fetch reviews.");
    }

    return response.successResponse(
      res,
      {
        reviews: result.reviews,
        pagination: result.pagination,
        summary: result.summary,
      },
      "Reviews fetched.",
    );
  } catch (err) {
    console.error("listAdminReviews:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const getAdminReviewById = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.getAdminReviewById(req.params.reviewId);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to fetch review.");
    }

    return response.successResponse(res, { review: result.review }, "Review fetched.");
  } catch (err) {
    console.error("getAdminReviewById:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const setAdminReviewStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.setAdminReviewStatus(
      req.params.reviewId,
      req.body.status,
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to update review status.");
    }

    return response.successResponse(
      res,
      { review: result.review },
      result.message,
    );
  } catch (err) {
    console.error("setAdminReviewStatus:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const deleteAdminReview = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.deleteAdminReview(req.params.reviewId);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to delete review.");
    }

    return response.successResponse(res, {}, result.message);
  } catch (err) {
    console.error("deleteAdminReview:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const bulkDeleteAdminReviews = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.bulkDeleteAdminReviews(req.body.reviewIds);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to delete reviews.");
    }

    return response.successResponse(
      res,
      { deletedCount: result.deletedCount },
      result.message,
    );
  } catch (err) {
    console.error("bulkDeleteAdminReviews:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

module.exports = {
  listAdminReviews,
  getAdminReviewById,
  setAdminReviewStatus,
  deleteAdminReview,
  bulkDeleteAdminReviews,
};
