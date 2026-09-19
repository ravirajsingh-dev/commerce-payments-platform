const { check, param } = require("express-validator");

const variantIdParam = () =>
  param("variantId")
    .trim()
    .notEmpty()
    .withMessage("Product variant id is required.")
    .isMongoId()
    .withMessage("Invalid product variant id.");

const addWishlistItemValidators = [
  check("variantId")
    .trim()
    .notEmpty()
    .withMessage("Product variant id is required.")
    .isMongoId()
    .withMessage("Invalid product variant id."),
];

const removeWishlistItemValidators = [variantIdParam()];
const toggleWishlistItemValidators = [variantIdParam()];

module.exports = {
  addWishlistItemValidators,
  removeWishlistItemValidators,
  toggleWishlistItemValidators,
};
