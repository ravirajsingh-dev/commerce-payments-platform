const express = require("express");
const { check } = require("express-validator");
const router = express.Router();

const { AdminAuth } = require("../../../shared/middleware/auth");
const { checkPermission } = require("../../../shared/middleware/permissions");
const {
  getStoreNavSectionsList,
  getStoreNavSectionById,
  createStoreNavSection,
  updateStoreNavSection,
  deleteStoreNavSection,
} = require("./storeNavSectionController");

router.get(
  "/list",
  [AdminAuth, checkPermission("storeNavigation", "list")],
  getStoreNavSectionsList,
);

router.get(
  "/:section_id",
  [AdminAuth, checkPermission("storeNavigation", "list")],
  getStoreNavSectionById,
);

router.post(
  "/create",
  [
    AdminAuth,
    checkPermission("storeNavigation", "create"),
    check("title", "Title is required").trim().notEmpty().isLength({ min: 2, max: 120 }),
    check("columnIndex")
      .optional()
      .isInt({ min: 0, max: 5 })
      .withMessage("Column must be between 0 and 5."),
    check("status")
      .optional()
      .isIn([1, 2, "1", "2"])
      .withMessage("Invalid status value."),
    check("sortOrder")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Sort order must be a valid non-negative number."),
    check("productIds")
      .optional()
      .isArray()
      .withMessage("Product ids must be an array."),
    check("productIds.*")
      .optional()
      .isMongoId()
      .withMessage("Invalid product id."),
  ],
  createStoreNavSection,
);

router.put(
  "/:section_id",
  [
    AdminAuth,
    checkPermission("storeNavigation", "edit"),
    check("title").optional().trim().notEmpty().isLength({ min: 2, max: 120 }),
    check("columnIndex")
      .optional()
      .isInt({ min: 0, max: 5 })
      .withMessage("Column must be between 0 and 5."),
    check("status")
      .optional()
      .isIn([1, 2, "1", "2"])
      .withMessage("Invalid status value."),
    check("sortOrder")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Sort order must be a valid non-negative number."),
    check("productIds")
      .optional()
      .isArray()
      .withMessage("Product ids must be an array."),
    check("productIds.*")
      .optional()
      .isMongoId()
      .withMessage("Invalid product id."),
  ],
  updateStoreNavSection,
);

router.delete(
  "/:section_id",
  [AdminAuth, checkPermission("storeNavigation", "delete")],
  deleteStoreNavSection,
);

module.exports = router;
