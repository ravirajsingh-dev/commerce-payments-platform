const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");
const { isValidOrderNoFormat } = require("./orderNumberGenerator");
const {
  STATUS_VALUES,
  ORDER_PAYMENT_STATUS,
} = require("../../../shared/constants/order");
const {
  ADMIN_CANCELLATION_REASON_CODES,
  CANCELLATION_NOTE_MAX_LENGTH,
} = require("./cancellationReasons");
const { CLAIM_STATUS_VALUES, CLAIM_TYPE_VALUES } = require("../../../shared/constants/orderClaim");
const {
  CUSTOMER_CLAIM_REASON_CODES,
  CLAIM_NOTE_MAX_LENGTH,
  ADMIN_CLAIM_RESOLUTION_CODES,
} = require("./claimReasons");
const { claimEvidenceArrayValidator } = require("./orderValidation");

const orderNoParam = () =>
  param("orderNo")
    .trim()
    .custom((value) => {
      if (!isValidOrderNoFormat(value)) {
        throw new Error("Invalid order number.");
      }
      return true;
    });

const listAdminOrdersValidators = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("orderBy")
    .optional()
    .isIn(["createdAt", "orderNo", "status", "amounts.total"]),
  query("ascending").optional().isIn(["asc", "desc"]),
  query("status").optional().isIn(STATUS_VALUES),
  query("paymentStatus").optional().isIn(Object.values(ORDER_PAYMENT_STATUS)),
  query("orderNo").optional().isString().trim().isLength({ max: 40 }),
  query("userId").optional().isMongoId(),
  query("fromDate").optional().isISO8601().toDate(),
  query("toDate").optional().isISO8601().toDate(),
  query("pendingCancelRequest")
    .optional()
    .custom((value) => {
      if (value === undefined || value === "") {
        return true;
      }
      const normalized = String(value).trim().toLowerCase();
      if (["true", "false", "1", "0", "yes", "no"].includes(normalized)) {
        return true;
      }
      throw new Error("Invalid pending cancel request filter.");
    }),
  query("pendingClaim")
    .optional()
    .custom((value) => {
      if (value === undefined || value === "") {
        return true;
      }
      const normalized = String(value).trim().toLowerCase();
      if (["true", "false", "1", "0", "yes", "no"].includes(normalized)) {
        return true;
      }
      throw new Error("Invalid pending claim filter.");
    }),
];

const getAdminOrderValidators = [orderNoParam()];

const updateAdminOrderValidators = [
  orderNoParam(),
  body("status").optional().isIn(STATUS_VALUES),
  body("paymentStatus").optional().isIn(Object.values(ORDER_PAYMENT_STATUS)),
  body().custom((_, { req }) => {
    const { status, paymentStatus } = req.body || {};
    if (status === undefined && paymentStatus === undefined) {
      throw new Error("Provide at least one field to update.");
    }
    return true;
  }),
];

const cancelAdminOrderValidators = [
  orderNoParam(),
  body("reason")
    .trim()
    .notEmpty()
    .withMessage("Please select a cancellation reason.")
    .isIn(ADMIN_CANCELLATION_REASON_CODES),
  body("note")
    .optional()
    .isString()
    .trim()
    .isLength({ max: CANCELLATION_NOTE_MAX_LENGTH })
    .withMessage(`Note must be at most ${CANCELLATION_NOTE_MAX_LENGTH} characters.`),
];

const patchOrderAddressSnapshotValidators = [
  orderNoParam(),
  body("addressSnapshot")
    .isObject()
    .withMessage("Provide a valid shipping address."),
  body("addressSnapshot.fullName")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 }),
  body("addressSnapshot.phone")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 10 }),
  body("addressSnapshot.addressLine1")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 }),
  body("addressSnapshot.addressLine2")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 }),
  body("addressSnapshot.city")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 80 }),
  body("addressSnapshot.state")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 80 }),
  body("addressSnapshot.pincode")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 6, max: 6 }),
  body("addressSnapshot.country")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 2 }),
];

const listAdminClaimsValidators = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("status").optional().isIn(CLAIM_STATUS_VALUES),
  query("orderNo").optional().isString().trim().isLength({ max: 40 }),
  query("userId").optional().isMongoId(),
  query("fromDate").optional().isISO8601().toDate(),
  query("toDate").optional().isISO8601().toDate(),
  query("orderBy")
    .optional()
    .isIn(["createdAt", "orderNo", "status", "requestedAt"]),
  query("ascending").optional().isIn(["asc", "desc"]),
];

const approveRejectClaimValidators = [
  orderNoParam(),
  body("decisionNote")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Decision note must be at most 500 characters."),
];

const rejectClaimValidators = [
  orderNoParam(),
  body("decisionNote")
    .trim()
    .notEmpty()
    .withMessage("Decision note is required.")
    .isLength({ max: 500 })
    .withMessage("Decision note must be at most 500 characters."),
];

const createAdminClaimRequestValidators = [
  orderNoParam(),
  body("type")
    .trim()
    .notEmpty()
    .withMessage("Claim type is required.")
    .isIn(CLAIM_TYPE_VALUES)
    .withMessage("Invalid claim type."),
  body("reasonCode")
    .trim()
    .notEmpty()
    .withMessage("Claim reason is required.")
    .isIn(CUSTOMER_CLAIM_REASON_CODES)
    .withMessage("Invalid claim reason."),
  body("note")
    .optional()
    .isString()
    .trim()
    .isLength({ max: CLAIM_NOTE_MAX_LENGTH })
    .withMessage(`Note must be at most ${CLAIM_NOTE_MAX_LENGTH} characters.`),
  body("affectedLines")
    .optional()
    .isArray()
    .withMessage("affectedLines must be an array.")
    .bail()
    .custom((rows) => {
      for (const row of rows) {
        if (!row || typeof row !== "object") {
          throw new Error("Each affected line must be an object.");
        }
        if (!mongoose.isValidObjectId(row.orderItemId)) {
          throw new Error("Each affected line needs a valid orderItemId.");
        }
        const qty = Number(row.quantity);
        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error("Each affected line needs a positive integer quantity.");
        }
      }
      return true;
    }),
  claimEvidenceArrayValidator("evidence.images"),
  claimEvidenceArrayValidator("evidence.courierReceipt"),
];

const patchClaimValidators = [
  orderNoParam(),
  body("status").optional().isIn(CLAIM_STATUS_VALUES),
  body("adminNote")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Admin note must be at most 500 characters."),
  body("customerLogistics").optional().isObject(),
  body("courierName").optional().isString().trim().isLength({ max: 120 }),
  body("trackingNumber").optional().isString().trim().isLength({ max: 120 }),
  body().custom((_, { req }) => {
    const { status, adminNote, customerLogistics, courierName, trackingNumber } = req.body || {};
    if (
      status === undefined &&
      adminNote === undefined &&
      customerLogistics === undefined &&
      courierName === undefined &&
      trackingNumber === undefined
    ) {
      throw new Error("Provide claim status or operational update fields.");
    }
    return true;
  }),
];

const completeClaimValidators = [
  orderNoParam(),
  body("resolutionCode")
    .trim()
    .notEmpty()
    .withMessage("Resolution code is required.")
    .isIn(ADMIN_CLAIM_RESOLUTION_CODES)
    .withMessage("Invalid resolution code."),
  body("resolutionNote")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Resolution note must be at most 500 characters."),
  body("refundAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Refund amount must be a non-negative number."),
  body("paymentStatus").optional().isIn(Object.values(ORDER_PAYMENT_STATUS)),
  body("restockLines").optional().isArray(),
  body("restockLines.*.orderItemId").optional().isMongoId(),
  body("restockLines.*.quantity").optional().isInt({ min: 1 }),
  body("restockLines.*.adminConfirmRestock").optional().isBoolean(),
  body("restockLines.*.adminConfirmQc").optional().isBoolean(),
  body("adminConfirmQc").optional().isBoolean(),
];

module.exports = {
  listAdminOrdersValidators,
  getAdminOrderValidators,
  updateAdminOrderValidators,
  cancelAdminOrderValidators,
  patchOrderAddressSnapshotValidators,
  listAdminClaimsValidators,
  approveRejectClaimValidators,
  rejectClaimValidators,
  createAdminClaimRequestValidators,
  patchClaimValidators,
  completeClaimValidators,
};
