const express = require("express");
const router = express.Router();
const { UserAuth } = require("../../shared/middleware/auth");
const { check } = require("express-validator");
const { updateUserById, updateAvatarByUserId } = require("./userController");
const User = require("../../models/User");
const {
  validateEmailField,
  validatePhoneField,
} = require("../../shared/middleware/validateRequest");
const {
  checkSessionExpiry,
} = require("../../shared/middleware/checkSessionExpiry");

router.use("/addresses", require("../commerce/address/addressRoutes"));

// @route PUT api/users/:user_id
// @desc Edit user Nickname by user_id
// @access Private
router.put(
  "/:user_id",
  [
    UserAuth,
    [
      check("name", "Please provide the name")
        .not()
        .isEmpty()
        .withMessage("Name cannot be empty")
        .isLength({ min: 3, max: 20 })
        .withMessage("Name must be between 3 and 20 characters long")
        .custom((value) => {
          // Reject HTML/script tags
          if (/<[^>]*>/g.test(value)) {
            throw new Error("Name cannot contain HTML or script tags");
          }
          // Reject MongoDB operators
          if (/\$[a-zA-Z]+/.test(value)) {
            throw new Error("Name contains invalid characters");
          }
          return true;
        }),

      validateEmailField("email"),
      check("email").custom(async (value, { req }) => {
        const user_id = req.params.user_id;
        if (value) {
          const is_user_exists = await User.findOne({
            email: value,
            _id: { $ne: user_id },
          });
          if (is_user_exists) {
            throw new Error("Provided email is already registered.");
          }
        }
      }),

      validatePhoneField("phone"),
      check("phone").custom(async (value, { req }) => {
        const user_id = req.params.user_id;
        if (value) {
          const is_user_exists = await User.findOne({
            phone: value,
            _id: { $ne: user_id },
          });
          if (is_user_exists) {
            throw new Error("Provided phone is already registered.");
          }
        }
      }),

      check(
        "state",
        "State is required and should be at most 50 characters long",
      )
        .optional()
        .isString()
        .isLength({ max: 50 })
        .custom((value) => {
          if (value && /<[^>]*>/g.test(value)) {
            throw new Error("State cannot contain HTML or script tags");
          }
          return true;
        }),
    ],
  ],
  updateUserById,
);

// @route PUT api/users/:user_id/avatar
// @desc Update user avatar by user_id
// @access Private
router.put(
  "/:user_id/avatar",
  [
    UserAuth,
    [
      check("avatar", "Please provide the avatar")
        .not()
        .isEmpty()
        .withMessage("Avatar cannot be empty")
        .isLength({ min: 3, max: 10 })
        .withMessage("Avatar must be between 3 and 10 characters long")
        .custom((value) => {
          // Reject HTML/script tags
          if (/<[^>]*>/g.test(value)) {
            throw new Error("Avatar cannot contain HTML or script tags");
          }
          // Reject MongoDB operators
          if (/\$[a-zA-Z]+/.test(value)) {
            throw new Error("Avatar contains invalid characters");
          }
          return true;
        }),
    ],
  ],
  updateAvatarByUserId,
);

module.exports = router;
