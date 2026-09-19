const { check, param, query } = require("express-validator");

const sizeBodyField = () =>
  check("size")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ max: 40 })
    .withMessage("Size must be a string up to 40 characters.");

const qtyBodyField = (required = true) => {
  const chain = check("qty")
    .isInt({ min: 1, max: 99 })
    .withMessage("Quantity must be between 1 and 99.");
  return required ? chain : chain.optional();
};

const variantIdBodyField = () =>
  check("variantId", "Product variant id is required")
    .notEmpty()
    .isMongoId()
    .withMessage("Invalid product variant id.");

const variantIdParamField = () =>
  param("variantId", "Product variant id is required")
    .isMongoId()
    .withMessage("Invalid product variant id.");

const sizeQueryField = () =>
  query("size")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ max: 40 })
    .withMessage("Size must be a string up to 40 characters.");

const addCartItemValidators = [
  variantIdBodyField(),
  sizeBodyField(),
  qtyBodyField(false),
];

const newSizeBodyField = () =>
  check("newSize")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ max: 40 })
    .withMessage("New size must be a string up to 40 characters.");

const updateCartItemValidators = [
  variantIdBodyField(),
  sizeBodyField(),
  newSizeBodyField(),
  qtyBodyField(false),
  check("qty").custom((value, { req }) => {
    const hasNewSize =
      req.body.newSize !== undefined &&
      req.body.newSize !== null &&
      String(req.body.newSize).trim() !== "";
    if (hasNewSize) return true;
    if (value === undefined || value === null || value === "") {
      throw new Error("Quantity is required.");
    }
    return true;
  }),
];

const removeCartItemValidators = [variantIdParamField(), sizeQueryField()];

module.exports = {
  addCartItemValidators,
  updateCartItemValidators,
  removeCartItemValidators,
};
