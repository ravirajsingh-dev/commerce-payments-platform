const express = require("express");
const { check } = require("express-validator");
const router = express.Router();

const { AdminAuth } = require("../../../shared/middleware/auth");
const { checkPermission } = require("../../../shared/middleware/permissions");
const {
  getAttributeSetsList,
  getAttributeSetById,
  createAttributeSet,
  updateAttributeSet,
  deleteAttributeSet,
} = require("./attributeSetController");

router.get(
  "/list",
  [AdminAuth, checkPermission("attributeSet", "list")],
  getAttributeSetsList,
);
router.get(
  "/:attribute_set_id",
  [AdminAuth, checkPermission("attributeSet", "list")],
  getAttributeSetById,
);

router.post(
  "/create",
  [
    AdminAuth,
    checkPermission("attributeSet", "create"),
    check("name", "Name is required")
      .trim()
      .notEmpty()
      .isLength({ min: 2, max: 120 }),
    check("code").optional({ checkFalsy: true }).trim(),
    check("isActive")
      .optional()
      .isBoolean()
      .withMessage("Invalid active status value."),
  ],
  createAttributeSet,
);

router.put(
  "/:attribute_set_id",
  [
    AdminAuth,
    checkPermission("attributeSet", "edit"),
    check("name").optional().trim().notEmpty().isLength({ min: 2, max: 120 }),
    check("code").optional({ checkFalsy: true }).trim(),
    check("isActive")
      .optional()
      .isBoolean()
      .withMessage("Invalid active status value."),
  ],
  updateAttributeSet,
);

router.delete(
  "/:attribute_set_id",
  [AdminAuth, checkPermission("attributeSet", "delete")],
  deleteAttributeSet,
);

module.exports = router;
