const { param } = require("express-validator");

const adminUserCartParamValidators = [
  param("user_id").isMongoId().withMessage("Invalid user id."),
];

module.exports = {
  adminUserCartParamValidators,
};
