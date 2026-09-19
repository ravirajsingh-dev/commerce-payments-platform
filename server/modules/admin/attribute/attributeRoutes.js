const express = require("express");
const { check } = require("express-validator");
const router = express.Router();

const { AdminAuth } = require("../../../shared/middleware/auth");
const { checkPermission } = require("../../../shared/middleware/permissions");
const {
  getAttributesList,
  getAttributesOverview,
  getAttributeById,
  createAttribute,
  updateAttribute,
  deleteAttribute,
} = require("./attributeController");

router.get(
  "/list",
  [AdminAuth, checkPermission("attribute", "list")],
  getAttributesList,
);
router.get(
  "/overview",
  [AdminAuth, checkPermission("attribute", "list")],
  getAttributesOverview,
);
router.get(
  "/:attribute_id",
  [AdminAuth, checkPermission("attribute", "list")],
  getAttributeById,
);

router.post(
  "/create",
  [
    AdminAuth,
    checkPermission("attribute", "create"),
    check("attributeSetId", "Attribute set is required").notEmpty().isMongoId(),
    check("name", "Name is required")
      .trim()
      .notEmpty()
      .isLength({ min: 2, max: 120 }),
    check("code", "Code is required").trim().notEmpty(),
    check("inputType")
      .isIn(["text", "number", "select", "boolean"])
      .withMessage("Invalid input type."),
    check("isRequired").optional().isBoolean(),
    check("isFilterable").optional().isBoolean(),
    check("isVariant").optional().isBoolean(),
    check("isActive").optional().isBoolean(),
    check("options")
      .optional()
      .isArray()
      .withMessage("Options must be a valid array."),
  ],
  createAttribute,
);

router.put(
  "/:attribute_id",
  [
    AdminAuth,
    checkPermission("attribute", "edit"),
    check("attributeSetId").optional().isMongoId(),
    check("name").optional().trim().notEmpty().isLength({ min: 2, max: 120 }),
    check("code").optional().trim().notEmpty(),
    check("inputType")
      .optional()
      .isIn(["text", "number", "select", "boolean"])
      .withMessage("Invalid input type."),
    check("isRequired").optional().isBoolean(),
    check("isFilterable").optional().isBoolean(),
    check("isVariant").optional().isBoolean(),
    check("isActive").optional().isBoolean(),
    check("options")
      .optional()
      .isArray()
      .withMessage("Options must be a valid array."),
  ],
  updateAttribute,
);

router.delete(
  "/:attribute_id",
  [AdminAuth, checkPermission("attribute", "delete")],
  deleteAttribute,
);

module.exports = router;
