const { check } = require("express-validator");

const couponCodeBodyField = () =>
  check("code")
    .trim()
    .notEmpty()
    .withMessage("Coupon code is required.")
    .isLength({ min: 3, max: 32 })
    .withMessage("Coupon code must be 3–32 characters.");

const validateCouponValidators = [couponCodeBodyField()];
const applyCouponValidators = [couponCodeBodyField()];

module.exports = {
  validateCouponValidators,
  applyCouponValidators,
};
