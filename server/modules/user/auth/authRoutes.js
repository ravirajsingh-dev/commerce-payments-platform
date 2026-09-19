const express = require("express");
const { check } = require("express-validator");
const router = express.Router();
const {
  validatePhoneField,
  validateEmailField,
} = require("../../../shared/middleware/validateRequest");
const {
  passwordField,
  otpField,
  confirmPasswordField,
} = require("../../../shared/middleware/authValidationSchemas");

// Custom imports
const {
  login,
  logout,
  logoutAll,
  checkAuth,
  changePassword,
  forgotPasswordStep1,
  forgotPasswordStep2,
} = require("./authController");
const refreshToken = require("./userRefreshTokenController");
const { UserAuth } = require("../../../shared/middleware/auth");
const {
  checkSessionExpiry,
} = require("../../../shared/middleware/checkSessionExpiry");

// @route POST api/auth
// @desc Authenticate user
// @access Public
router.post(
  "/",
  [
    check("phone", "Phone is required").trim().notEmpty(),
    validatePhoneField("phone"),
    passwordField("password", "Password"),
  ],
  login,
);

// @route PUT api/auth/logout
// @desc Logout user from current device
// @access Private (requires authentication)
router.put("/logout", UserAuth, logout);

// @route PUT api/auth/logout-all
// @desc Logout user from all devices
// @access Private (requires authentication)
router.put("/logout-all", UserAuth, logoutAll);

// @route GET api/auth/load-user
// @desc Load authenticated user
// @access Private
router.get("/load-user", UserAuth, checkSessionExpiry, checkAuth);

// @route POST api/auth/refresh-token
// @desc Refresh access token
// @access Private (requires authentication)
router.post("/refresh-token", refreshToken);
router.post("/refresh", refreshToken);

// @route POST api/auth/change-password
// @desc Change password
// @access Private (requires authentication)
router.post(
  "/change-password",
  UserAuth,
  [
    passwordField("oldPassword", "Old password"),
    passwordField("password", "Password"),
  ],
  checkSessionExpiry,
  changePassword,
);

// @route POST api/auth/forgot-password/verify
// @desc Verify phone number for password reset
// @access Public
router.post(
  "/forgot-password/verify",
  [validatePhoneField("phone")],
  forgotPasswordStep1,
);

// @route POST api/auth/forgot-password/reset
// @desc Reset password by verifying phone
// @access Public (no auth middleware)
router.post(
  "/forgot-password/reset",
  [validatePhoneField("phone")],
  forgotPasswordStep2,
);

const {
  verifyPhone,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPasswordWithOtp,
  resendForgotPasswordOtp,
} = require("./forgotPasswordOtpController");

// @route POST api/auth/forgot-password-email/verify-phone
// @desc Verify registered phone and return masked email
// @access Public
router.post(
  "/forgot-password-email/verify-phone",
  [
    check("phone", "Phone is required").trim().notEmpty(),
    validatePhoneField("phone"),
  ],
  verifyPhone,
);

// @route POST api/auth/forgot-password-email/send-otp
// @desc Send OTP to email for password reset (after phone verification)
// @access Public
router.post(
  "/forgot-password-email/send-otp",
  [
    check("phone", "Phone is required").trim().notEmpty(),
    validatePhoneField("phone"),
    validateEmailField("email"),
  ],
  sendForgotPasswordOtp,
);

// @route POST api/auth/forgot-password-email/resend-otp
// @desc Resend OTP to email for password reset
// @access Public
router.post(
  "/forgot-password-email/resend-otp",
  [
    check("phone", "Phone is required").trim().notEmpty(),
    validatePhoneField("phone"),
  ],
  resendForgotPasswordOtp,
);

// @route POST api/auth/forgot-password-email/verify-otp
// @desc Verify OTP for password reset
// @access Public
router.post(
  "/forgot-password-email/verify-otp",
  [
    check("phone", "Phone is required").trim().notEmpty(),
    validatePhoneField("phone"),
    otpField("otp"),
  ],
  verifyForgotPasswordOtp,
);

// @route POST api/auth/forgot-password-email/reset
// @desc Reset password after OTP verification
// @access Public
router.post(
  "/forgot-password-email/reset",
  [
    check("phone", "Phone is required").trim().notEmpty(),
    validatePhoneField("phone"),
    otpField("otp"),
    passwordField("password", "Password"),
    confirmPasswordField("confirmPassword", "password"),
  ],
  resetPasswordWithOtp,
);

module.exports = router;
