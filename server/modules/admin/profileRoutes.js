const express = require("express");
const { check } = require("express-validator");
const router = express.Router();

const { AdminAuth } = require("../../shared/middleware/auth");
const {
  validateEmailField,
  validatePhoneField,
} = require("../../shared/middleware/validateRequest");
const {
  getMyProfile,
  updateMyProfile,
} = require("./profile/adminProfileController");

router.get("/profile/me", AdminAuth, getMyProfile);

router.put(
  "/profile/me",
  [
    AdminAuth,
    check("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Name is required.")
      .isLength({ min: 3, max: 20 })
      .withMessage("Name must be between 3 and 20 characters."),
    validatePhoneField("phone"),
    validateEmailField("email"),
  ],
  updateMyProfile,
);

module.exports = router;
