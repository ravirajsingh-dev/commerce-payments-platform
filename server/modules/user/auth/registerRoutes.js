const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const {
  validatePhoneField,
  validateEmailField,
} = require("../../../shared/middleware/validateRequest");
const {
  passwordField,
} = require("../../../shared/middleware/authValidationSchemas");

const { register } = require("./registerController");

router.post(
  "/register",
  [
    check("name", "Name is required")
      .isString()
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 150 })
      .custom((value) => {
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Name cannot contain HTML or script tags");
        }
        if (/\$[a-zA-Z]+/.test(value)) {
          throw new Error("Name contains invalid characters");
        }
        return true;
      }),

    validatePhoneField("phone"),

    check("email", "Email is required").trim().notEmpty(),
    validateEmailField("email"),

    passwordField("password", "Password"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: false,
          message: "Validation Error",
          errors: errors
            .array()
            .map((e) => ({ path: e.param || e.path, msg: e.msg })),
        });
      }

      await register(req, res);
    } catch (error) {
      console.error("Error handling user registration:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

module.exports = router;
