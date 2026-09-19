const mongoose = require("mongoose");
const Coupon = require("../../../models/Coupon");

const parsePagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const COUPON_ADMIN_ERROR = {
  INVALID_ID: "INVALID_COUPON_ID",
  NOT_FOUND: "COUPON_NOT_FOUND",
  DUPLICATE_CODE: "DUPLICATE_COUPON_CODE",
  INVALID_DISCOUNT: "INVALID_DISCOUNT",
  INVALID_DATES: "INVALID_DATES",
  USAGE_LIMIT_BELOW_USED: "USAGE_LIMIT_BELOW_USED",
  HAS_USAGE: "COUPON_HAS_USAGE",
  NO_UPDATES: "NO_UPDATES",
};

const DISCOUNT_TYPES = new Set(["percentage", "flat"]);
const COUPON_STATUSES = new Set([1, 2]);

const normalizeCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const serializeCoupon = (doc) => {
  if (!doc) return null;
  const row = doc.toObject ? doc.toObject() : doc;
  return {
    _id: String(row._id),
    code: row.code || "",
    title: row.title || "",
    termsAndConditions: row.termsAndConditions || "",
    discountType: row.discountType,
    discountValue: row.discountValue,
    minOrderAmount: row.minOrderAmount ?? 0,
    maxDiscountAmount: row.maxDiscountAmount ?? 0,
    usageLimit: row.usageLimit ?? 0,
    usageLimitPerUser: row.usageLimitPerUser ?? 0,
    usedCount: row.usedCount ?? 0,
    startsAt: row.startsAt || null,
    endsAt: row.endsAt || null,
    status: row.status ?? 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const validateDiscount = ({ discountType, discountValue }) => {
  const value = Number(discountValue);
  if (!DISCOUNT_TYPES.has(discountType)) {
    return { ok: false, error: COUPON_ADMIN_ERROR.INVALID_DISCOUNT };
  }
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, error: COUPON_ADMIN_ERROR.INVALID_DISCOUNT };
  }
  if (discountType === "percentage" && (value <= 0 || value > 100)) {
    return { ok: false, error: COUPON_ADMIN_ERROR.INVALID_DISCOUNT };
  }
  if (discountType === "flat" && value <= 0) {
    return { ok: false, error: COUPON_ADMIN_ERROR.INVALID_DISCOUNT };
  }
  return { ok: true, value };
};

const validateDateRange = (startsAt, endsAt) => {
  const start = startsAt ? new Date(startsAt) : null;
  const end = endsAt ? new Date(endsAt) : null;
  if (startsAt && Number.isNaN(start?.getTime())) {
    return { ok: false, error: COUPON_ADMIN_ERROR.INVALID_DATES };
  }
  if (endsAt && Number.isNaN(end?.getTime())) {
    return { ok: false, error: COUPON_ADMIN_ERROR.INVALID_DATES };
  }
  if (start && end && end < start) {
    return { ok: false, error: COUPON_ADMIN_ERROR.INVALID_DATES };
  }
  return { ok: true, startsAt: start, endsAt: end };
};

const buildListFilter = (query = {}) => {
  const filter = {};

  const code = normalizeCode(query.code);
  if (code) {
    filter.code = new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  const title = String(query.title || "").trim();
  if (title) {
    filter.title = new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  const discountType = String(query.discountType || "").trim().toLowerCase();
  if (discountType) {
    if (!DISCOUNT_TYPES.has(discountType)) {
      return { error: COUPON_ADMIN_ERROR.INVALID_DISCOUNT };
    }
    filter.discountType = discountType;
  }

  const status = parseInt(query.status, 10);
  if (query.status !== undefined && query.status !== "") {
    if (!COUPON_STATUSES.has(status)) {
      return { error: "INVALID_STATUS" };
    }
    filter.status = status;
  }

  return { filter };
};

const buildStatusSummary = async (filter) => {
  const rows = await Coupon.aggregate([
    { $match: filter },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const summary = { active: 0, inactive: 0 };
  rows.forEach((row) => {
    if (row._id === 1) summary.active = row.count;
    if (row._id === 2) summary.inactive = row.count;
  });
  return summary;
};

const listAdminCoupons = async (query = {}) => {
  const filterResult = buildListFilter(query);
  if (filterResult.error) {
    return {
      ok: false,
      error: filterResult.error,
      message: "Invalid list filters.",
      statusCode: 400,
    };
  }

  const { page, limit, skip } = parsePagination(query);
  const filter = filterResult.filter;
  const orderBy = String(query.orderBy || "createdAt");
  const allowedOrderBy = new Set([
    "code",
    "title",
    "status",
    "discountType",
    "createdAt",
    "endsAt",
  ]);
  const safeOrderBy = allowedOrderBy.has(orderBy) ? orderBy : "createdAt";
  const sortOrder = String(query.ascending || "desc").toLowerCase() === "asc" ? 1 : -1;

  const [total, coupons, summary] = await Promise.all([
    Coupon.countDocuments(filter),
    Coupon.find(filter)
      .sort({ [safeOrderBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    buildStatusSummary(filter),
  ]);

  return {
    ok: true,
    coupons: coupons.map(serializeCoupon),
    pagination: { page, limit, total },
    summary,
  };
};

const getAdminCouponById = async (couponId) => {
  if (!mongoose.Types.ObjectId.isValid(couponId)) {
    return {
      ok: false,
      error: COUPON_ADMIN_ERROR.INVALID_ID,
      message: "Invalid coupon id.",
      statusCode: 400,
    };
  }

  const coupon = await Coupon.findById(couponId).lean();
  if (!coupon) {
    return {
      ok: false,
      error: COUPON_ADMIN_ERROR.NOT_FOUND,
      message: "Coupon not found.",
      statusCode: 404,
    };
  }

  return { ok: true, coupon: serializeCoupon(coupon) };
};

const createAdminCoupon = async (payload) => {
  const code = normalizeCode(payload.code);
  if (!code || code.length < 3 || code.length > 32) {
    return {
      ok: false,
      message: "Coupon code must be 3–32 characters.",
      statusCode: 400,
    };
  }

  const title = String(payload.title || "").trim();
  if (!title) {
    return {
      ok: false,
      message: "Title is required.",
      statusCode: 400,
    };
  }

  const discountCheck = validateDiscount({
    discountType: payload.discountType,
    discountValue: payload.discountValue,
  });
  if (!discountCheck.ok) {
    return {
      ok: false,
      error: discountCheck.error,
      message: "Invalid discount configuration.",
      statusCode: 400,
    };
  }

  const dateCheck = validateDateRange(payload.startsAt, payload.endsAt);
  if (!dateCheck.ok) {
    return {
      ok: false,
      error: dateCheck.error,
      message: "End date must be on or after start date.",
      statusCode: 400,
    };
  }

  const status = parseInt(payload.status, 10);
  const normalizedStatus = Number.isNaN(status) ? 1 : status;
  if (!COUPON_STATUSES.has(normalizedStatus)) {
    return {
      ok: false,
      message: "Invalid status.",
      statusCode: 400,
    };
  }

  const existing = await Coupon.findOne({ code }).select("_id").lean();
  if (existing) {
    return {
      ok: false,
      error: COUPON_ADMIN_ERROR.DUPLICATE_CODE,
      message: "Coupon code already exists.",
      statusCode: 409,
      errors: [{ path: "code", msg: "Coupon code already exists." }],
    };
  }

  const termsAndConditions = String(payload.termsAndConditions || "").trim();

  const coupon = await Coupon.create({
    code,
    title,
    termsAndConditions,
    discountType: payload.discountType,
    discountValue: discountCheck.value,
    minOrderAmount: Math.max(Number(payload.minOrderAmount) || 0, 0),
    maxDiscountAmount: Math.max(Number(payload.maxDiscountAmount) || 0, 0),
    usageLimit: Math.max(parseInt(payload.usageLimit, 10) || 0, 0),
    usageLimitPerUser: Math.max(parseInt(payload.usageLimitPerUser, 10) || 0, 0),
    usedCount: 0,
    startsAt: dateCheck.startsAt,
    endsAt: dateCheck.endsAt,
    status: normalizedStatus,
  });

  return { ok: true, coupon: serializeCoupon(coupon) };
};

const updateAdminCoupon = async (couponId, payload) => {
  if (!mongoose.Types.ObjectId.isValid(couponId)) {
    return {
      ok: false,
      error: COUPON_ADMIN_ERROR.INVALID_ID,
      message: "Invalid coupon id.",
      statusCode: 400,
    };
  }

  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    return {
      ok: false,
      error: COUPON_ADMIN_ERROR.NOT_FOUND,
      message: "Coupon not found.",
      statusCode: 404,
    };
  }

  const updates = {};

  if (payload.code !== undefined) {
    const code = normalizeCode(payload.code);
    if (!code || code.length < 3 || code.length > 32) {
      return {
        ok: false,
        message: "Coupon code must be 3–32 characters.",
        statusCode: 400,
      };
    }
    if (code !== coupon.code) {
      const duplicate = await Coupon.findOne({ code, _id: { $ne: coupon._id } })
        .select("_id")
        .lean();
      if (duplicate) {
        return {
          ok: false,
          error: COUPON_ADMIN_ERROR.DUPLICATE_CODE,
          message: "Coupon code already exists.",
          statusCode: 409,
          errors: [{ path: "code", msg: "Coupon code already exists." }],
        };
      }
    }
    updates.code = code;
  }

  if (payload.title !== undefined) {
    const title = String(payload.title || "").trim();
    if (!title) {
      return {
        ok: false,
        message: "Title is required.",
        statusCode: 400,
      };
    }
    updates.title = title;
  }

  if (payload.termsAndConditions !== undefined) {
    updates.termsAndConditions = String(payload.termsAndConditions || "").trim();
  }

  const nextDiscountType = payload.discountType ?? coupon.discountType;
  const nextDiscountValue =
    payload.discountValue !== undefined ? payload.discountValue : coupon.discountValue;
  if (payload.discountType !== undefined || payload.discountValue !== undefined) {
    const discountCheck = validateDiscount({
      discountType: nextDiscountType,
      discountValue: nextDiscountValue,
    });
    if (!discountCheck.ok) {
      return {
        ok: false,
        error: discountCheck.error,
        message: "Invalid discount configuration.",
        statusCode: 400,
      };
    }
    updates.discountType = nextDiscountType;
    updates.discountValue = discountCheck.value;
  }

  if (payload.minOrderAmount !== undefined) {
    updates.minOrderAmount = Math.max(Number(payload.minOrderAmount) || 0, 0);
  }

  if (payload.maxDiscountAmount !== undefined) {
    updates.maxDiscountAmount = Math.max(Number(payload.maxDiscountAmount) || 0, 0);
  }

  if (payload.usageLimit !== undefined) {
    const usageLimit = Math.max(parseInt(payload.usageLimit, 10) || 0, 0);
    if (usageLimit > 0 && usageLimit < coupon.usedCount) {
      return {
        ok: false,
        error: COUPON_ADMIN_ERROR.USAGE_LIMIT_BELOW_USED,
        message: "Usage limit cannot be less than times already used.",
        statusCode: 400,
        errors: [
          {
            path: "usageLimit",
            msg: "Usage limit cannot be less than times already used.",
          },
        ],
      };
    }
    updates.usageLimit = usageLimit;
  }

  if (payload.usageLimitPerUser !== undefined) {
    updates.usageLimitPerUser = Math.max(parseInt(payload.usageLimitPerUser, 10) || 0, 0);
  }

  if (payload.startsAt !== undefined || payload.endsAt !== undefined) {
    const dateCheck = validateDateRange(
      payload.startsAt !== undefined ? payload.startsAt : coupon.startsAt,
      payload.endsAt !== undefined ? payload.endsAt : coupon.endsAt,
    );
    if (!dateCheck.ok) {
      return {
        ok: false,
        error: dateCheck.error,
        message: "End date must be on or after start date.",
        statusCode: 400,
      };
    }
    if (payload.startsAt !== undefined) {
      updates.startsAt = dateCheck.startsAt;
    }
    if (payload.endsAt !== undefined) {
      updates.endsAt = dateCheck.endsAt;
    }
  }

  if (payload.status !== undefined) {
    const status = parseInt(payload.status, 10);
    if (!COUPON_STATUSES.has(status)) {
      return {
        ok: false,
        message: "Invalid status.",
        statusCode: 400,
      };
    }
    updates.status = status;
  }

  if (!Object.keys(updates).length) {
    return {
      ok: false,
      error: COUPON_ADMIN_ERROR.NO_UPDATES,
      message: "No updates provided.",
      statusCode: 400,
    };
  }

  Object.assign(coupon, updates);
  await coupon.save();

  return { ok: true, coupon: serializeCoupon(coupon) };
};

const setAdminCouponStatus = async (couponId, status) => {
  const parsed = parseInt(status, 10);
  if (!COUPON_STATUSES.has(parsed)) {
    return {
      ok: false,
      message: "Invalid status.",
      statusCode: 400,
    };
  }
  return updateAdminCoupon(couponId, { status: parsed });
};

const deleteAdminCoupon = async (couponId) => {
  if (!mongoose.Types.ObjectId.isValid(couponId)) {
    return {
      ok: false,
      error: COUPON_ADMIN_ERROR.INVALID_ID,
      message: "Invalid coupon id.",
      statusCode: 400,
    };
  }

  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    return {
      ok: false,
      error: COUPON_ADMIN_ERROR.NOT_FOUND,
      message: "Coupon not found.",
      statusCode: 404,
    };
  }

  if (Number(coupon.usedCount) > 0) {
    return {
      ok: false,
      error: COUPON_ADMIN_ERROR.HAS_USAGE,
      message:
        "This coupon has been used on orders and cannot be deleted. Disable it instead.",
      statusCode: 400,
    };
  }

  await Coupon.deleteOne({ _id: coupon._id });

  return { ok: true, message: "Coupon deleted." };
};

module.exports = {
  COUPON_ADMIN_ERROR,
  listAdminCoupons,
  getAdminCouponById,
  createAdminCoupon,
  updateAdminCoupon,
  setAdminCouponStatus,
  deleteAdminCoupon,
  serializeCoupon,
  normalizeCode,
};
