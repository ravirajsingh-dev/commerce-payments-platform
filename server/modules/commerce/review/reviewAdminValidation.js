const { body, check, param } = require("express-validator");

const reviewIdParam = () =>
  param("reviewId")
    .trim()
    .notEmpty()
    .withMessage("Review id is required.")
    .isMongoId()
    .withMessage("Invalid review id.");

const listAdminReviewsValidators = [
  check("page").optional().isInt({ min: 1 }),
  check("limit").optional().isInt({ min: 1, max: 100 }),
  check("status")
    .optional({ values: "falsy" })
    .trim()
    .isIn(["pending", "approved", "rejected"])
    .withMessage("Invalid status filter."),
  check("rating").optional({ values: "falsy" }).isInt({ min: 1, max: 5 }),
  check("productVariantId").optional({ values: "falsy" }).isMongoId(),
  check("productId").optional({ values: "falsy" }).isMongoId(),
  check("orderBy").optional().trim().isIn(["createdAt", "rating", "status"]),
  check("ascending").optional().trim().isIn(["asc", "desc"]),
  check("productName").optional({ values: "falsy" }).trim().isLength({ max: 100 }),
  check("userName").optional({ values: "falsy" }).trim().isLength({ max: 100 }),
];

const getReviewValidators = [reviewIdParam()];
const setReviewStatusValidators = [
  reviewIdParam(),
  check("status")
    .trim()
    .notEmpty()
    .withMessage("Status is required.")
    .isIn(["approved", "rejected"])
    .withMessage("Status must be approved or rejected."),
];

const bulkDeleteReviewsValidators = [
  body("reviewIds")
    .isArray({ min: 1, max: 50 })
    .withMessage("Provide between 1 and 50 review ids."),
  body("reviewIds.*").isMongoId().withMessage("Invalid review id in list."),
];

module.exports = {
  listAdminReviewsValidators,
  getReviewValidators,
  setReviewStatusValidators,
  bulkDeleteReviewsValidators,
};
