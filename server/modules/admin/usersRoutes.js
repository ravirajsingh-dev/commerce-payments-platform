const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { AdminAuth } = require("../../shared/middleware/auth");
const { checkPermission } = require("../../shared/middleware/permissions");
const {
  validateEmailField,
  validatePhoneField,
} = require("../../shared/middleware/validateRequest");
const {
  PASSWORD_MIN_LENGTH,
} = require("../../shared/constants/passwordPolicy");

const User = require("../../models/User");

const {
  getUsersList,
  getUserById,
  getUserAnalytics,
  getUserOrders,
  getUserCart,
  clearUserCart,
  createUser,
  updateUser,
  deleteUser,
} = require("./users/adminUserController");
const { getAdminUserOrdersValidators } = require("./adminUserOrdersValidation");
const { adminUserCartParamValidators } = require("./adminUserCartValidation");

// @route GET api/admin/users/list
// @desc Get users list
// @access Private
router.get(
  "/list",
  [AdminAuth, checkPermission("users", "list")],
  getUsersList,
);
router.get(
  "/:user_id/orders",
  [AdminAuth, checkPermission("users", "list"), ...getAdminUserOrdersValidators],
  getUserOrders,
);
router.get(
  "/:user_id/analytics",
  [AdminAuth, checkPermission("users", "list"), ...adminUserCartParamValidators],
  getUserAnalytics,
);
router.get(
  "/:user_id/cart",
  [AdminAuth, checkPermission("users", "list"), ...adminUserCartParamValidators],
  getUserCart,
);
router.delete(
  "/:user_id/cart",
  [AdminAuth, checkPermission("users", "edit"), ...adminUserCartParamValidators],
  clearUserCart,
);
router.get(
  "/:user_id",
  [AdminAuth, checkPermission("users", "list")],
  getUserById,
);

router.post(
  "/create",
  [
    AdminAuth,
    checkPermission("users", "create"),
    check("name", "Name is required")
      .trim()
      .notEmpty()
      .isLength({ min: 3, max: 50 }),
    validatePhoneField("phone"),
    check("phone").custom(async (value) => {
      const existing = await User.findOne({ phone: String(value).trim() });
      if (existing) {
        throw new Error("Provided phone is already registered.");
      }
      return true;
    }),
    check("email", "Email is required").trim().notEmpty(),
    validateEmailField("email"),
    check("email").custom(async (value) => {
      const existing = await User.findOne({
        email: String(value).trim().toLowerCase(),
      });
      if (existing) {
        throw new Error("Provided email is already registered.");
      }
      return true;
    }),
    check(
      "password",
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
    ).isLength({
      min: PASSWORD_MIN_LENGTH,
    }),
    check("status")
      .optional()
      .isIn([1, 2, 3, 4, "1", "2", "3", "4"])
      .withMessage("Invalid status value."),
  ],
  createUser,
);

router.put(
  "/:user_id",
  [
    AdminAuth,
    checkPermission("users", "edit"),
    check("name").optional().trim().notEmpty().isLength({ min: 3, max: 50 }),
    validatePhoneField("phone"),
    check("phone")
      .optional()
      .custom(async (value, { req }) => {
        const existing = await User.findOne({
          phone: String(value).trim(),
          _id: { $ne: req.params.user_id },
        });
        if (existing) {
          throw new Error("Provided phone is already registered.");
        }
        return true;
      }),
    check("email").optional().trim().notEmpty(),
    validateEmailField("email"),
    check("email")
      .optional()
      .custom(async (value, { req }) => {
        const existing = await User.findOne({
          email: String(value).trim().toLowerCase(),
          _id: { $ne: req.params.user_id },
        });
        if (existing) {
          throw new Error("Provided email is already registered.");
        }
        return true;
      }),
    check("password")
      .optional({ checkFalsy: true })
      .isLength({ min: PASSWORD_MIN_LENGTH })
      .withMessage(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
      ),
    check("status")
      .optional()
      .isIn([1, 2, 3, 4, "1", "2", "3", "4"])
      .withMessage("Invalid status value."),
  ],
  updateUser,
);

router.delete(
  "/:user_id",
  [AdminAuth, checkPermission("users", "delete")],
  deleteUser,
);

module.exports = router;
