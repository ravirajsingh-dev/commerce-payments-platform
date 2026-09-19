const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const service = require("./couponAdminService");

const handleServiceFailure = (res, result, fallbackMessage) =>
  response.errorResponse(
    res,
    result.errors || {},
    result.message || fallbackMessage,
    result.statusCode || 400,
  );

const listAdminCoupons = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.listAdminCoupons(req.query);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to fetch coupons.");
    }

    return response.successResponse(
      res,
      {
        coupons: result.coupons,
        pagination: result.pagination,
        summary: result.summary,
      },
      "Coupons fetched.",
    );
  } catch (err) {
    console.error("listAdminCoupons:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const getAdminCouponById = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.getAdminCouponById(req.params.couponId);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to fetch coupon.");
    }

    return response.successResponse(res, { coupon: result.coupon }, "Coupon fetched.");
  } catch (err) {
    console.error("getAdminCouponById:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const createAdminCoupon = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.createAdminCoupon(req.body);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to create coupon.");
    }

    return response.successResponse(
      res,
      { coupon: result.coupon },
      "Coupon created.",
      201,
    );
  } catch (err) {
    console.error("createAdminCoupon:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const updateAdminCoupon = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.updateAdminCoupon(req.params.couponId, req.body);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to update coupon.");
    }

    return response.successResponse(res, { coupon: result.coupon }, "Coupon updated.");
  } catch (err) {
    console.error("updateAdminCoupon:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const setAdminCouponStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.setAdminCouponStatus(
      req.params.couponId,
      req.body.status,
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to update coupon status.");
    }

    return response.successResponse(res, { coupon: result.coupon }, "Coupon status updated.");
  } catch (err) {
    console.error("setAdminCouponStatus:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const deleteAdminCoupon = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.deleteAdminCoupon(req.params.couponId);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to delete coupon.");
    }

    return response.successResponse(res, {}, result.message || "Coupon deleted.");
  } catch (err) {
    console.error("deleteAdminCoupon:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

module.exports = {
  listAdminCoupons,
  getAdminCouponById,
  createAdminCoupon,
  updateAdminCoupon,
  setAdminCouponStatus,
  deleteAdminCoupon,
};
