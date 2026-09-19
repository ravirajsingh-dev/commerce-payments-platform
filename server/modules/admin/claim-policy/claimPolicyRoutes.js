const express = require("express");
const { check, param } = require("express-validator");
const mongoose = require("mongoose");
const { AdminAuth } = require("../../../shared/middleware/auth");
const { checkPermission } = require("../../../shared/middleware/permissions");
const controller = require("./claimPolicyController");

const router = express.Router();

router.get(
  "/list",
  [AdminAuth, checkPermission("product", "list")],
  controller.listClaimPolicies,
);
router.get(
  "/:id",
  [
    AdminAuth,
    checkPermission("product", "list"),
    param("id").custom((value) => mongoose.Types.ObjectId.isValid(value)),
  ],
  controller.getClaimPolicyById,
);

router.post(
  "/create",
  [
    AdminAuth,
    checkPermission("product", "edit"),
    check("code", "Code is required").trim().notEmpty().isLength({ min: 2, max: 60 }),
    check("name", "Name is required").trim().notEmpty().isLength({ min: 2, max: 120 }),
    check("eligibility.claimWindowDays")
      .optional({ nullable: true })
      .isInt({ min: 0 })
      .withMessage("Claim window days must be a non-negative integer."),
  ],
  controller.createClaimPolicy,
);
router.put(
  "/:id",
  [
    AdminAuth,
    checkPermission("product", "edit"),
    param("id").custom((value) => mongoose.Types.ObjectId.isValid(value)),
    check("code")
      .optional()
      .trim()
      .isLength({ min: 2, max: 60 })
      .withMessage("Code must be between 2 and 60 characters."),
    check("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage("Name must be between 2 and 120 characters."),
    check("eligibility.claimWindowDays")
      .optional({ nullable: true })
      .isInt({ min: 0 })
      .withMessage("Claim window days must be a non-negative integer."),
  ],
  controller.updateClaimPolicy,
);
router.patch(
  "/:id/status",
  [
    AdminAuth,
    checkPermission("product", "edit"),
    param("id").custom((value) => mongoose.Types.ObjectId.isValid(value)),
    check("isActive", "isActive must be boolean").isBoolean(),
  ],
  controller.setClaimPolicyStatus,
);
router.delete(
  "/:id",
  [
    AdminAuth,
    checkPermission("product", "delete"),
    param("id").custom((value) => mongoose.Types.ObjectId.isValid(value)),
  ],
  controller.deleteClaimPolicy,
);

module.exports = router;
