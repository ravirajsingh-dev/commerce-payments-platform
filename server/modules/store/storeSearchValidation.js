const { query } = require("express-validator");

const catalogSearchValidators = [
  query("q").optional().isString().withMessage("q must be a string."),
];

module.exports = {
  catalogSearchValidators,
};
