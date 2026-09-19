const { check } = require("express-validator");
const {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_ALLOWED_REGEX,
  PASSWORD_POLICY_MESSAGE,
} = require("../constants/passwordPolicy");

const rejectHtmlScriptTags = (value, fieldLabel = "Field") => {
  if (/<[^>]*>/g.test(value)) {
    throw new Error(`${fieldLabel} cannot contain HTML or script tags`);
  }
  return true;
};

const passwordField = (fieldName = "password", label = "Password") =>
  check(fieldName, `${label} is required`)
    .not()
    .isEmpty()
    .withMessage(`${label} is required`)
    .isLength({ min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })
    .withMessage(PASSWORD_POLICY_MESSAGE)
    .matches(PASSWORD_ALLOWED_REGEX)
    .withMessage(PASSWORD_POLICY_MESSAGE)
    .custom((value) => rejectHtmlScriptTags(value, label));

const otpField = (fieldName = "otp") =>
  check(fieldName, "OTP is required")
    .trim()
    .not()
    .isEmpty()
    .withMessage("OTP cannot be empty")
    .matches(/^\d{6}$/)
    .withMessage("OTP must be exactly 6 digits");

const confirmPasswordField = (
  confirmFieldName = "confirmPassword",
  passwordFieldName = "password",
) =>
  check(confirmFieldName, "Confirm Password is required")
    .not()
    .isEmpty()
    .custom((value, { req }) => {
      if (value !== req.body[passwordFieldName]) {
        throw new Error("Passwords do not match");
      }
      return true;
    });

module.exports = {
  passwordField,
  otpField,
  confirmPasswordField,
};
