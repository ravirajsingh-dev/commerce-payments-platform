const { check, param, query } = require("express-validator");

const couponIdParam = param("couponId")
  .isMongoId()
  .withMessage("Invalid coupon id.");

const listAdminCouponsValidators = [
  query("page").optional().isInt({ min: 1 }).withMessage("Invalid page."),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Invalid limit."),
  query("status")
    .optional()
    .isIn([1, 2, "1", "2"])
    .withMessage("Invalid status filter."),
  query("discountType")
    .optional()
    .isIn(["percentage", "flat"])
    .withMessage("Invalid discount type filter."),
  query("orderBy")
    .optional()
    .isIn(["code", "title", "status", "discountType", "createdAt", "endsAt"])
    .withMessage("Invalid orderBy."),
  query("ascending")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Invalid sort direction."),
];

const createCouponValidators = [
  check("code")
    .trim()
    .notEmpty()
    .withMessage("Coupon code is required.")
    .isLength({ min: 3, max: 32 })
    .withMessage("Coupon code must be 3–32 characters."),
  check("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required.")
    .isLength({ max: 120 })
    .withMessage("Title must be at most 120 characters."),
  check("termsAndConditions")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Terms must be at most 2000 characters."),
  check("discountType")
    .isIn(["percentage", "flat"])
    .withMessage("Discount type must be percentage or flat."),
  check("discountValue")
    .isFloat({ min: 0 })
    .withMessage("Discount value must be a non-negative number."),
  check("minOrderAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum order amount must be zero or greater."),
  check("maxDiscountAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum discount must be zero or greater."),
  check("usageLimit")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Usage limit must be a non-negative integer."),
  check("usageLimitPerUser")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Per-user usage limit must be a non-negative integer."),
  check("startsAt")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Invalid start date."),
  check("endsAt")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Invalid end date."),
  check("status")
    .optional()
    .isIn([1, 2, "1", "2"])
    .withMessage("Invalid status."),
];

const updateCouponValidators = [
  couponIdParam,
  check("code")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Coupon code cannot be empty.")
    .isLength({ min: 3, max: 32 })
    .withMessage("Coupon code must be 3–32 characters."),
  check("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty.")
    .isLength({ max: 120 })
    .withMessage("Title must be at most 120 characters."),
  check("termsAndConditions")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Terms must be at most 2000 characters."),
  check("discountType")
    .optional()
    .isIn(["percentage", "flat"])
    .withMessage("Discount type must be percentage or flat."),
  check("discountValue")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Discount value must be a non-negative number."),
  check("minOrderAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum order amount must be zero or greater."),
  check("maxDiscountAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum discount must be zero or greater."),
  check("usageLimit")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Usage limit must be a non-negative integer."),
  check("usageLimitPerUser")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Per-user usage limit must be a non-negative integer."),
  check("startsAt")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Invalid start date."),
  check("endsAt")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Invalid end date."),
  check("status")
    .optional()
    .isIn([1, 2, "1", "2"])
    .withMessage("Invalid status."),
];

const getCouponValidators = [couponIdParam];

const setCouponStatusValidators = [
  couponIdParam,
  check("status")
    .isIn([1, 2, "1", "2"])
    .withMessage("Status must be 1 (active) or 2 (disabled)."),
];

module.exports = {
  listAdminCouponsValidators,
  createCouponValidators,
  updateCouponValidators,
  getCouponValidators,
  setCouponStatusValidators,
};
