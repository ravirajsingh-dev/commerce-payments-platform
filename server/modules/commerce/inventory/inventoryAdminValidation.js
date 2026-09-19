const { body, query } = require("express-validator");
const { STOCK_ADJUSTMENT_REASONS } = require("./stockAdjustmentReasons");

const createStockAdjustmentValidators = [
  body("variantId").isMongoId().withMessage("Invalid product variant id."),
  body("size")
    .optional({ values: "null" })
    .isString()
    .trim()
    .isLength({ max: 40 }),
  body("delta")
    .isInt({ min: -100000, max: 100000 })
    .custom((value) => {
      if (value === 0) {
        throw new Error("Delta must be a non-zero integer.");
      }
      return true;
    }),
  body("reason")
    .isString()
    .trim()
    .toLowerCase()
    .isIn(STOCK_ADJUSTMENT_REASONS)
    .withMessage("Invalid adjustment reason."),
];

const listStockAdjustmentsValidators = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("variantId").optional().isMongoId(),
  query("sku").optional().isString().trim().isLength({ max: 80 }),
  query("reason")
    .optional()
    .isString()
    .trim()
    .toLowerCase()
    .isIn(STOCK_ADJUSTMENT_REASONS),
  query("adminId").optional().isMongoId(),
];

module.exports = {
  createStockAdjustmentValidators,
  listStockAdjustmentsValidators,
};
