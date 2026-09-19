const { param, query } = require("express-validator");
const {
  STATUS_VALUES,
  ORDER_PAYMENT_STATUS,
} = require("../../shared/constants/order");

const getAdminUserOrdersValidators = [
  param("user_id").isMongoId().withMessage("Invalid user id."),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("status").optional().isIn(STATUS_VALUES),
  query("paymentStatus").optional().isIn(Object.values(ORDER_PAYMENT_STATUS)),
  query("orderNo").optional().isString().trim().isLength({ max: 40 }),
  query("fromDate").optional().isISO8601().toDate(),
  query("toDate").optional().isISO8601().toDate(),
];

module.exports = {
  getAdminUserOrdersValidators,
};
