const { check, param } = require("express-validator");
const { isValidOrderNoFormat } = require("../order/orderNumberGenerator");

const variantIdParam = () =>
  param("variantId")
    .trim()
    .notEmpty()
    .withMessage("Product variant id is required.")
    .isMongoId()
    .withMessage("Invalid product variant id.");

const listVariantReviewsValidators = [
  variantIdParam(),
  check("page").optional().isInt({ min: 1 }).withMessage("Page must be at least 1."),
  check("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be 1–50."),
  check("sort")
    .optional()
    .isIn(["latest", "positive", "negative", "helpful"])
    .withMessage("Invalid sort option."),
];

const submitReviewValidators = [
  check("productVariantId")
    .trim()
    .notEmpty()
    .withMessage("Product variant id is required.")
    .isMongoId()
    .withMessage("Invalid product variant id."),
  check("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5."),
  check("title")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 150 })
    .withMessage("Title must be at most 150 characters."),
  check("comment")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 1500 })
    .withMessage("Comment must be at most 1500 characters."),
];

const orderNoParam = () =>
  param("orderNo")
    .trim()
    .notEmpty()
    .withMessage("Order number is required.")
    .custom((value) => isValidOrderNoFormat(value))
    .withMessage("Order number format is invalid.");

const getOrderReviewContextValidators = [orderNoParam()];

module.exports = {
  listVariantReviewsValidators,
  submitReviewValidators,
  getOrderReviewContextValidators,
};
