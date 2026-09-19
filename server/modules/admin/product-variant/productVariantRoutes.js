const express = require("express");
const { check } = require("express-validator");
const multer = require("multer");
const router = express.Router();

const { AdminAuth } = require("../../../shared/middleware/auth");
const { checkPermission } = require("../../../shared/middleware/permissions");
const {
  getProductVariantsList,
  getProductVariantsOverview,
  getProductVariantById,
  getVariantsByProductId,
  bulkCreateProductVariants,
  uploadVariantImage,
  uploadVariantImages,
  deleteVariantImage,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
} = require("./productVariantController");

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(
    require("path").extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error("Only jpg, jpeg, png, and webp images are allowed!"));
};
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
});

router.get(
  "/list",
  [AdminAuth, checkPermission("product", "list")],
  getProductVariantsList,
);

router.get(
  "/overview",
  [AdminAuth, checkPermission("product", "list")],
  getProductVariantsOverview,
);

router.get(
  "/product/:product_id",
  [AdminAuth, checkPermission("product", "list")],
  getVariantsByProductId,
);

router.post(
  "/bulk-create",
  [
    AdminAuth,
    checkPermission("product", "create"),
    check("productId", "Product is required").notEmpty().isMongoId(),
    check("variants")
      .notEmpty()
      .custom((value) => Array.isArray(value) && value.length > 0 && value.length <= 100)
      .withMessage("Variants must be a non-empty array (max 100)."),
  ],
  bulkCreateProductVariants,
);

router.post(
  "/upload-image",
  upload.single("image"),
  [AdminAuth, checkPermission("product", "create")],
  uploadVariantImage,
);

router.post(
  "/upload-images",
  upload.array("images", 100),
  [AdminAuth, checkPermission("product", "create")],
  uploadVariantImages,
);

router.post(
  "/delete-image",
  [AdminAuth, checkPermission("product", "list")],
  deleteVariantImage,
);

router.post(
  "/create",
  [
    AdminAuth,
    checkPermission("product", "create"),
    check("productId", "Product is required").notEmpty().isMongoId(),
    check("sku", "SKU is required").trim().notEmpty().isLength({ min: 1, max: 120 }),
    check("name")
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 1, max: 180 })
      .withMessage("Name must be between 1 and 180 characters."),
    check("shortDescription")
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Short description must be at most 500 characters."),
    check("attributes")
      .notEmpty()
      .custom(
        (value) =>
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value) &&
          Object.keys(value).length > 0,
      )
      .withMessage("Attributes must be a non-empty object."),
    check("price", "Price is required")
      .isFloat({ min: 0 })
      .withMessage("Price must be a non-negative number."),
    check("discountType")
      .optional({ nullable: true, checkFalsy: true })
      .isIn(["percentage", "flat"])
      .withMessage("Discount type must be percentage or flat."),
    check("discountValue")
      .optional({ nullable: true })
      .isFloat({ min: 0 })
      .withMessage("Discount value must be a non-negative number."),
    check("stock")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Stock must be a non-negative integer."),
    check("status")
      .optional()
      .isIn([1, 2, 3, "1", "2", "3"])
      .withMessage("Invalid status value."),
    check("isNewArrival")
      .optional()
      .custom((value) => {
        if (value === undefined || value === null) return true;
        return (
          typeof value === "boolean" ||
          value === "true" ||
          value === "false" ||
          value === 1 ||
          value === 0 ||
          value === "1" ||
          value === "0"
        );
      })
      .withMessage("isNewArrival must be a boolean."),
    check("images").optional().custom((value) => {
      if (value === undefined || value === null) return true;
      if (typeof value === "string") return true;
      return Array.isArray(value);
    }),
    check("sizes")
      .optional({ nullable: true })
      .custom((value) => {
        if (value === undefined || value === null) return true;
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        if (!Array.isArray(parsed)) return false;
        if (parsed.length === 0) return true;
        if (parsed.length > 50) return false;
        return parsed.every((row) => {
          if (!row || typeof row !== "object") return false;
          if (!String(row.value || "").trim()) return false;
          if (!Number.isFinite(Number(row.stock ?? 0)) || Number(row.stock ?? 0) < 0) {
            return false;
          }
          const desc = row.description;
          if (desc === undefined || desc === null || desc === "") return true;
          return String(desc).length <= 500;
        });
      })
      .withMessage(
        "Sizes must be an array of { value, label, stock, description? } (max 50); description max 500 chars.",
      ),
  ],
  createProductVariant,
);

router.get(
  "/:product_variant_id",
  [AdminAuth, checkPermission("product", "list")],
  getProductVariantById,
);

router.put(
  "/:product_variant_id",
  [
    AdminAuth,
    checkPermission("product", "edit"),
    check("sku")
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 120 }),
    check("name")
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 180 })
      .withMessage("Name must be at most 180 characters."),
    check("shortDescription")
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 500 })
      .withMessage("Short description must be at most 500 characters."),
    check("attributes")
      .optional()
      .custom(
        (value) => value === undefined || (typeof value === "object" && value !== null),
      )
      .withMessage("Attributes must be a valid object."),
    check("price")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price must be a non-negative number."),
    check("discountType")
      .optional({ nullable: true })
      .custom((value) => {
        if (value === undefined || value === null || value === "") return true;
        return ["percentage", "flat"].includes(String(value));
      })
      .withMessage("Discount type must be percentage or flat."),
    check("discountValue")
      .optional({ nullable: true })
      .isFloat({ min: 0 })
      .withMessage("Discount value must be a non-negative number."),
    check("stock")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Stock must be a non-negative integer."),
    check("status")
      .optional()
      .isIn([1, 2, 3, "1", "2", "3"])
      .withMessage("Invalid status value."),
    check("isNewArrival")
      .optional()
      .custom((value) => {
        if (value === undefined || value === null) return true;
        return (
          typeof value === "boolean" ||
          value === "true" ||
          value === "false" ||
          value === 1 ||
          value === 0 ||
          value === "1" ||
          value === "0"
        );
      })
      .withMessage("isNewArrival must be a boolean."),
    check("images").optional(),
    check("removedImagePublicIds").optional(),
    check("sizes")
      .optional({ nullable: true })
      .custom((value) => {
        if (value === undefined || value === null) return true;
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        if (!Array.isArray(parsed)) return false;
        if (parsed.length === 0) return true;
        if (parsed.length > 50) return false;
        return parsed.every((row) => {
          if (!row || typeof row !== "object") return false;
          if (!String(row.value || "").trim()) return false;
          if (!Number.isFinite(Number(row.stock ?? 0)) || Number(row.stock ?? 0) < 0) {
            return false;
          }
          const desc = row.description;
          if (desc === undefined || desc === null || desc === "") return true;
          return String(desc).length <= 500;
        });
      })
      .withMessage(
        "Sizes must be an array of { value, label, stock, description? } (max 50); description max 500 chars.",
      ),
  ],
  updateProductVariant,
);

router.delete(
  "/:product_variant_id",
  [AdminAuth, checkPermission("product", "delete")],
  deleteProductVariant,
);

module.exports = router;
