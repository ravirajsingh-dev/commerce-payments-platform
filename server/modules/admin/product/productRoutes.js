const express = require("express");
const { check } = require("express-validator");
const multer = require("multer");
const router = express.Router();

const { AdminAuth } = require("../../../shared/middleware/auth");
const { checkPermission } = require("../../../shared/middleware/permissions");
const {
  getProductsList,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("./productController");
const {
  isValidSizeChartPayload,
} = require("./productSizeChartHelpers");
const upload = multer();

const SIZE_CHART_INVALID_MSG =
  "Size chart must be an object { sizes:[{value,label}], rows:[{label,values?}] } with non-negative numeric measurements.";

router.get(
  "/list",
  [AdminAuth, checkPermission("product", "list")],
  getProductsList,
);
router.get(
  "/:product_id",
  [AdminAuth, checkPermission("product", "list")],
  getProductById,
);

router.post(
  "/create",
  upload.none(),
  [
    AdminAuth,
    checkPermission("product", "create"),
    check("name", "Name is required")
      .trim()
      .notEmpty()
      .bail()
      .isLength({ min: 2, max: 120 }),
    check("slug").optional({ checkFalsy: true }).trim(),
    check("primaryCategoryId", "Primary category is required")
      .notEmpty()
      .bail()
      .isMongoId(),
    check("categoryIds")
      .optional()
      .custom((value) => Array.isArray(value) || typeof value === "string")
      .withMessage("Category ids must be a valid array."),
    check("categoryIds.*")
      .optional({ nullable: true, checkFalsy: true })
      .isMongoId()
      .withMessage("Invalid category id."),
    check("attributeSetId", "Attribute set is required")
      .notEmpty()
      .bail()
      .isMongoId(),
    check("claimPolicyId")
      .optional({ nullable: true, checkFalsy: true })
      .isMongoId()
      .withMessage("Invalid claim policy id."),
    check("status")
      .optional()
      .isIn([1, 2, 3, "1", "2", "3"])
      .withMessage("Invalid status value."),
    check("searchKeywords")
      .optional()
      .custom((value) => typeof value === "string" || Array.isArray(value))
      .withMessage("Search keywords must be a valid array."),
    check("description")
      .optional()
      .custom((value) => typeof value === "string")
      .withMessage("Description must be a valid string."),
    check("deliveryDescription")
      .optional()
      .custom((value) => typeof value === "string")
      .withMessage("Delivery description must be a valid string."),
    check("purchaseNote")
      .optional()
      .custom((value) => typeof value === "string")
      .withMessage("Purchase note must be a valid string."),
    check("attributes")
      .optional()
      .custom((value) => typeof value === "string" || typeof value === "object")
      .withMessage("Attributes must be a valid object."),
    check("seo")
      .optional()
      .custom((value) => typeof value === "string" || typeof value === "object")
      .withMessage("SEO must be a valid object."),
    check("sizeChart")
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => isValidSizeChartPayload(value))
      .withMessage(SIZE_CHART_INVALID_MSG),
  ],
  createProduct,
);

router.put(
  "/:product_id",
  upload.none(),
  [
    AdminAuth,
    checkPermission("product", "edit"),
    check("name").optional().trim().notEmpty().isLength({ min: 2, max: 120 }),
    check("slug").optional({ checkFalsy: true }).trim(),
    check("primaryCategoryId")
      .optional({ nullable: true, checkFalsy: true })
      .isMongoId()
      .withMessage("Invalid primary category id."),
    check("categoryIds")
      .optional()
      .custom((value) => Array.isArray(value) || typeof value === "string")
      .withMessage("Category ids must be a valid array."),
    check("categoryIds.*")
      .optional({ nullable: true, checkFalsy: true })
      .isMongoId()
      .withMessage("Invalid category id."),
    check("attributeSetId")
      .optional({ nullable: true, checkFalsy: true })
      .isMongoId()
      .withMessage("Invalid attribute set id."),
    check("claimPolicyId")
      .optional({ nullable: true, checkFalsy: true })
      .isMongoId()
      .withMessage("Invalid claim policy id."),
    check("status")
      .optional()
      .isIn([1, 2, 3, "1", "2", "3"])
      .withMessage("Invalid status value."),
    check("searchKeywords")
      .optional()
      .custom((value) => typeof value === "string" || Array.isArray(value))
      .withMessage("Search keywords must be a valid array."),
    check("description")
      .optional()
      .custom((value) => typeof value === "string")
      .withMessage("Description must be a valid string."),
    check("deliveryDescription")
      .optional()
      .custom((value) => typeof value === "string")
      .withMessage("Delivery description must be a valid string."),
    check("purchaseNote")
      .optional()
      .custom((value) => typeof value === "string")
      .withMessage("Purchase note must be a valid string."),
    check("attributes")
      .optional()
      .custom((value) => typeof value === "string" || typeof value === "object")
      .withMessage("Attributes must be a valid object."),
    check("seo")
      .optional()
      .custom((value) => typeof value === "string" || typeof value === "object")
      .withMessage("SEO must be a valid object."),
    check("sizeChart")
      .optional({ nullable: true, checkFalsy: true })
      .custom((value) => isValidSizeChartPayload(value))
      .withMessage(SIZE_CHART_INVALID_MSG),
  ],
  updateProduct,
);

router.delete(
  "/:product_id",
  [AdminAuth, checkPermission("product", "delete")],
  deleteProduct,
);

module.exports = router;
