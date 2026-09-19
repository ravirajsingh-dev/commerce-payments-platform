const { query } = require("express-validator");

const getSalesDashboardValidators = [
  query("topLimit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("topLimit must be between 1 and 50."),
  query("topCustomersLimit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("topCustomersLimit must be between 1 and 50."),
  query("fromDate")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("fromDate must be YYYY-MM-DD."),
  query("toDate")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("toDate must be YYYY-MM-DD."),
  query("period")
    .optional()
    .isIn(["day", "week", "month"])
    .withMessage("period must be day, week, or month."),
];

module.exports = {
  getSalesDashboardValidators,
};
