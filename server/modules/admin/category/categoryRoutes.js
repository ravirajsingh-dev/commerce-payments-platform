const express = require("express");
const { check } = require("express-validator");
const router = express.Router();

const { AdminAuth } = require("../../../shared/middleware/auth");
const { checkPermission } = require("../../../shared/middleware/permissions");
const {
  getCategoriesList,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("./categoryController");

// @route GET api/admin/categories/list
// @desc Get categories list
// @access Private
router.get(
  "/list",
  [AdminAuth, checkPermission("category", "list")],
  getCategoriesList,
);
router.get(
  "/:category_id",
  [AdminAuth, checkPermission("category", "list")],
  getCategoryById,
);

router.post(
  "/create",
  [
    AdminAuth,
    checkPermission("category", "create"),
    check("name", "Name is required")
      .trim()
      .notEmpty()
      .isLength({ min: 2, max: 120 }),
    check("slug").optional({ checkFalsy: true }).trim(),
    check("parentCategoryId")
      .optional({ nullable: true, checkFalsy: true })
      .isMongoId()
      .withMessage("Invalid parent category id."),
    check("status")
      .optional()
      .isIn([1, 2, "1", "2"])
      .withMessage("Invalid status value."),
    check("sortOrder")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Sort order must be a valid non-negative number."),
  ],
  createCategory,
);

router.put(
  "/:category_id",
  [
    AdminAuth,
    checkPermission("category", "edit"),
    check("name").optional().trim().notEmpty().isLength({ min: 2, max: 120 }),
    check("slug").optional({ checkFalsy: true }).trim(),
    check("parentCategoryId")
      .optional({ nullable: true, checkFalsy: true })
      .isMongoId()
      .withMessage("Invalid parent category id."),
    check("status")
      .optional()
      .isIn([1, 2, "1", "2"])
      .withMessage("Invalid status value."),
    check("sortOrder")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Sort order must be a valid non-negative number."),
  ],
  updateCategory,
);

router.delete(
  "/:category_id",
  [AdminAuth, checkPermission("category", "delete")],
  deleteCategory,
);

module.exports = router;
