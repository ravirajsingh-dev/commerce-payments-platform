const express = require("express");
const { check } = require("express-validator");
const router = express.Router();

// Custom imports
const standard_password = require("./adminAuthConstants");
const Admin = require("../../../models/Admin");
const SubAdmin = require("../../../models/SubAdmin");
const {
  logout,
  logoutAll,
  checkAuth,
  changePassword,
  adminLogin,
  changeTnxPassword,
  setTxnPassword,
  changePasswordAndTxnPassword,
} = require("./adminAuthController");

const adminRefreshToken = require("./adminRefreshTokenController");

const { isAdminIDValid } = require("../../../shared/utils/helper");
const {
  validateEmailField,
} = require("../../../shared/middleware/validateRequest");

const { AdminAuth } = require("../../../shared/middleware/auth");
const {
  checkSessionExpiry,
} = require("../../../shared/middleware/checkSessionExpiry");

// @route POST api/auth
// @desc Authenticate user
// @access Public
router.post(
  "/",
  [
    check("admin_id", "Admin ID is required")
      .trim()
      .notEmpty()
      .withMessage("Admin ID cannot be empty")
      .isLength({ min: 8, max: 15 })
      .withMessage("Admin ID must be between 8 and 15 characters")
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Admin ID cannot contain HTML or script tags");
        }
        // Reject MongoDB operators
        if (/\$[a-zA-Z]+/.test(value)) {
          throw new Error("Admin ID contains invalid characters");
        }
        return true;
      })
      .custom(async (value, { req }) => {
        // Validate admin_id format: alphanumeric, 8-15 characters
        if (!isAdminIDValid(value)) {
          throw new Error(
            "Invalid Admin ID format. Admin ID must be 8-15 alphanumeric characters.",
          );
        }

        // Check if admin or sub-admin exists with this admin_id (case-insensitive)
        let admin = await Admin.findOne({
          admin_id: { $regex: new RegExp("^" + value + "$", "i") },
        });

        // If not found in Admin, try SubAdmin
        if (!admin) {
          admin = await SubAdmin.findOne({
            admin_id: { $regex: new RegExp("^" + value + "$", "i") },
          });
        }

        if (
          !admin ||
          (typeof admin === "object" &&
            admin !== null &&
            Object.keys(admin).length === 0)
        ) {
          throw new Error("Invalid credentials.");
        }

        // Attach admin/sub-admin to request for use in controller
        req.admin = admin;
      }),
    check("password", standard_password.validation_msg)
      .matches(standard_password.validation_pattern)
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Password cannot contain HTML or script tags");
        }
        return true;
      }),
  ],
  adminLogin,
);

// @route PUT api/auth/logout
// @desc Logout admin from current device
// @access Private (requires authentication)
router.put("/logout", AdminAuth, logout);

// @route PUT api/auth/logout-all
// @desc Logout admin from all devices
// @access Private (requires authentication)
router.put("/logout-all", AdminAuth, logoutAll);

// @route GET api/auth/load-user
// @desc Load authenticated user
// @access Private
router.get("/load-admin", AdminAuth, checkSessionExpiry, checkAuth);

// @route POST api/auth/refresh-token
// @desc Refresh access token
// @access Private (requires authentication)
router.post("/refresh-token", adminRefreshToken);
router.post("/refresh", adminRefreshToken);

// @route POST api/auth/set-txn-password
// @desc Set tnx password
// @access Private (requires authentication)
router.post(
  "/set-txn-password",
  AdminAuth,
  checkSessionExpiry,
  [
    check("txn_password", standard_password.validation_msg)
      .matches(standard_password.validation_pattern)
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error(
            "Transaction password cannot contain HTML or script tags",
          );
        }
        return true;
      }),
  ],
  setTxnPassword,
);

// @route POST api/auth/change-txn-password
// @desc Change transaction password (Admin/SubAdmin)
// @access Private (requires authentication)
router.post(
  "/change-txn-password",
  AdminAuth,
  [
    check("currentTxnPassword", "Current transaction password is required")
      .notEmpty()
      .withMessage("Current transaction password cannot be empty")
      .matches(standard_password.validation_pattern)
      .withMessage(standard_password.validation_msg)
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error(
            "Transaction password cannot contain HTML or script tags",
          );
        }
        return true;
      }),
    check("newTxnPassword", standard_password.validation_msg)
      .matches(standard_password.validation_pattern)
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error(
            "Transaction password cannot contain HTML or script tags",
          );
        }
        return true;
      }),
    check("confirmTxnPassword", "Confirm transaction password is required")
      .notEmpty()
      .withMessage("Confirm transaction password cannot be empty")
      .custom((value, { req }) => {
        if (value !== req.body.newTxnPassword) {
          throw new Error("Transaction passwords do not match");
        }
        return true;
      }),
  ],
  checkSessionExpiry,
  changeTnxPassword,
);

// @route POST api/auth/change-password
// @desc Change password (Admin/SubAdmin)
// @access Private (requires authentication)
router.post(
  "/change-password",
  AdminAuth,
  [
    check("currentPassword", "Current password is required")
      .notEmpty()
      .withMessage("Current password cannot be empty")
      .matches(standard_password.validation_pattern)
      .withMessage(standard_password.validation_msg)
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Password cannot contain HTML or script tags");
        }
        return true;
      }),
    check("newPassword", standard_password.validation_msg)
      .matches(standard_password.validation_pattern)
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Password cannot contain HTML or script tags");
        }
        return true;
      }),
    check("confirmPassword", "Confirm password is required")
      .notEmpty()
      .withMessage("Confirm password cannot be empty")
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error("Passwords do not match");
        }
        return true;
      }),
  ],
  checkSessionExpiry,
  changePassword,
);

// @route POST api/auth/change-password-and-txn-password
// @desc Change both login password and transaction password (Admin/SubAdmin)
// @access Private (requires authentication)
router.post(
  "/change-password-and-txn-password",
  AdminAuth,
  [
    check("currentPassword", "Current password is required")
      .notEmpty()
      .withMessage("Current password cannot be empty")
      .matches(standard_password.validation_pattern)
      .withMessage(standard_password.validation_msg)
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Password cannot contain HTML or script tags");
        }
        return true;
      }),
    check("newPassword", standard_password.validation_msg)
      .matches(standard_password.validation_pattern)
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Password cannot contain HTML or script tags");
        }
        return true;
      }),
    check("confirmPassword", "Confirm password is required")
      .notEmpty()
      .withMessage("Confirm password cannot be empty")
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error("Passwords do not match");
        }
        return true;
      }),
    check("currentTxnPassword", "Current transaction password is required")
      .notEmpty()
      .withMessage("Current transaction password cannot be empty")
      .matches(standard_password.validation_pattern)
      .withMessage(standard_password.validation_msg)
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error(
            "Transaction password cannot contain HTML or script tags",
          );
        }
        return true;
      }),
    check("newTxnPassword", standard_password.validation_msg)
      .matches(standard_password.validation_pattern)
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error(
            "Transaction password cannot contain HTML or script tags",
          );
        }
        return true;
      }),
    check("confirmTxnPassword", "Confirm transaction password is required")
      .notEmpty()
      .withMessage("Confirm transaction password cannot be empty")
      .custom((value, { req }) => {
        if (value !== req.body.newTxnPassword) {
          throw new Error("Transaction passwords do not match");
        }
        return true;
      }),
  ],
  checkSessionExpiry,
  changePasswordAndTxnPassword,
);

// Admin Forgot Password Routes
const {
  verifyAdminId,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPasswordWithOtp,
  resendForgotPasswordOtp,
} = require("./adminForgotPasswordOtpController");

// @route POST api/auth/admin/forgot-password/verify-admin-id
// @desc Verify Admin ID and return masked email
// @access Public
router.post(
  "/forgot-password/verify-admin-id",
  [
    check("adminId", "Admin ID is required")
      .trim()
      .notEmpty()
      .withMessage("Admin ID cannot be empty")
      .isLength({ min: 8, max: 15 })
      .withMessage("Admin ID must be between 8 and 15 characters")
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Admin ID cannot contain HTML or script tags");
        }
        // Reject MongoDB operators
        if (/\$[a-zA-Z]+/.test(value)) {
          throw new Error("Admin ID contains invalid characters");
        }
        return true;
      }),
  ],
  verifyAdminId,
);

// @route POST api/auth/admin/forgot-password/send-otp
// @desc Send OTP to email for password reset (after Admin ID verification)
// @access Public
router.post(
  "/forgot-password/send-otp",
  [
    check("adminId", "Admin ID is required")
      .trim()
      .notEmpty()
      .withMessage("Admin ID cannot be empty")
      .isLength({ min: 8, max: 15 })
      .withMessage("Admin ID must be between 8 and 15 characters")
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Admin ID cannot contain HTML or script tags");
        }
        // Reject MongoDB operators
        if (/\$[a-zA-Z]+/.test(value)) {
          throw new Error("Admin ID contains invalid characters");
        }
        return true;
      }),
    validateEmailField("email"),
  ],
  sendForgotPasswordOtp,
);

// @route POST api/auth/admin/forgot-password/resend-otp
// @desc Resend OTP to email for password reset
// @access Public
router.post(
  "/forgot-password/resend-otp",
  [
    check("adminId", "Admin ID is required")
      .trim()
      .notEmpty()
      .withMessage("Admin ID cannot be empty")
      .isLength({ min: 8, max: 15 })
      .withMessage("Admin ID must be between 8 and 15 characters")
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Admin ID cannot contain HTML or script tags");
        }
        // Reject MongoDB operators
        if (/\$[a-zA-Z]+/.test(value)) {
          throw new Error("Admin ID contains invalid characters");
        }
        return true;
      }),
  ],
  resendForgotPasswordOtp,
);

// @route POST api/auth/admin/forgot-password/verify-otp
// @desc Verify OTP for password reset
// @access Public
router.post(
  "/forgot-password/verify-otp",
  [
    check("adminId", "Admin ID is required")
      .trim()
      .notEmpty()
      .withMessage("Admin ID cannot be empty")
      .isLength({ min: 8, max: 15 })
      .withMessage("Admin ID must be between 8 and 15 characters")
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Admin ID cannot contain HTML or script tags");
        }
        // Reject MongoDB operators
        if (/\$[a-zA-Z]+/.test(value)) {
          throw new Error("Admin ID contains invalid characters");
        }
        return true;
      }),
    check("otp", "OTP is required")
      .trim()
      .notEmpty()
      .withMessage("OTP cannot be empty")
      .matches(/^\d{6}$/)
      .withMessage("OTP must be exactly 6 digits"),
  ],
  verifyForgotPasswordOtp,
);

// @route POST api/auth/admin/forgot-password/reset
// @desc Reset password after OTP verification
// @access Public
router.post(
  "/forgot-password/reset",
  [
    check("adminId", "Admin ID is required")
      .trim()
      .notEmpty()
      .withMessage("Admin ID cannot be empty")
      .isLength({ min: 8, max: 15 })
      .withMessage("Admin ID must be between 8 and 15 characters")
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Admin ID cannot contain HTML or script tags");
        }
        // Reject MongoDB operators
        if (/\$[a-zA-Z]+/.test(value)) {
          throw new Error("Admin ID contains invalid characters");
        }
        return true;
      }),
    check("otp", "OTP is required")
      .trim()
      .notEmpty()
      .withMessage("OTP cannot be empty")
      .matches(/^\d{6}$/)
      .withMessage("OTP must be exactly 6 digits"),
    check("password", standard_password.validation_msg)
      .matches(standard_password.validation_pattern)
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Password cannot contain HTML or script tags");
        }
        return true;
      }),
    check("confirmPassword", "Confirm Password is required")
      .notEmpty()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords do not match");
        }
        return true;
      }),
  ],
  resetPasswordWithOtp,
);

module.exports = router;
