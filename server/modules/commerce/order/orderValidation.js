const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");
const { isValidOrderNoFormat } = require("./orderNumberGenerator");
const {
  CUSTOMER_CANCELLATION_REASON_CODES,
  CANCELLATION_NOTE_MAX_LENGTH,
} = require("./cancellationReasons");
const {
  CUSTOMER_CLAIM_REASON_CODES,
  CLAIM_NOTE_MAX_LENGTH,
} = require("./claimReasons");
const { CLAIM_TYPE_VALUES } = require("../../../shared/constants/orderClaim");
const { CLAIM_EVIDENCE_CATEGORIES } = require("./orderClaimEvidenceService");

const orderNoParam = () =>
  param("orderNo")
    .trim()
    .custom((value) => {
      if (!isValidOrderNoFormat(value)) {
        throw new Error("Invalid order number.");
      }
      return true;
    });

const listUserOrdersValidators = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100."),
];

const getUserOrderValidators = [orderNoParam()];

const getUserOrderInvoiceValidators = [orderNoParam()];

const cancelRequestValidators = [
  orderNoParam(),
  body("reason")
    .trim()
    .notEmpty()
    .withMessage("Cancellation reason is required.")
    .isIn(CUSTOMER_CANCELLATION_REASON_CODES)
    .withMessage("Invalid cancellation reason."),
  body("note")
    .optional()
    .trim()
    .isLength({ max: CANCELLATION_NOTE_MAX_LENGTH })
    .withMessage(`Note must be at most ${CANCELLATION_NOTE_MAX_LENGTH} characters.`),
  body().custom((value) => {
    if (value?.reason === "other" && !String(value?.note || "").trim()) {
      throw new Error("Please add a short note when selecting Other.");
    }
    return true;
  }),
];

const claimEvidenceArrayValidator = (field) =>
  body(field)
    .optional()
    .isArray()
    .withMessage(`${field} must be an array.`)
    .bail()
    .custom((rows) => {
      for (const row of rows) {
        if (!row || typeof row !== "object") {
          throw new Error(`${field} must contain objects.`);
        }
        if (!String(row.url || "").trim() || !String(row.key || "").trim()) {
          throw new Error(`${field} entries require url and key.`);
        }
      }
      return true;
    });

const claimRequestValidators = [
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

const claimEvidenceUploadValidators = [
  orderNoParam(),
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Evidence category is required.")
    .isIn([...CLAIM_EVIDENCE_CATEGORIES])
    .withMessage("Invalid evidence category."),
];

const claimReturnShipmentValidators = [
  orderNoParam(),
  body("customerLogistics.trackingNumber")
    .trim()
    .notEmpty()
    .withMessage("Tracking number is required."),
  body("customerLogistics.courierName")
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Courier name is too long."),
  body("evidence.courierReceipt")
    .isArray({ min: 1 })
    .withMessage("Courier receipt is required.")
    .bail()
    .custom((rows) => {
      for (const row of rows) {
        if (!row || typeof row !== "object") {
          throw new Error("evidence.courierReceipt must contain objects.");
        }
        if (!String(row.url || "").trim() || !String(row.key || "").trim()) {
          throw new Error("evidence.courierReceipt entries require url and key.");
        }
      }
      return true;
    }),
];

module.exports = {
  listUserOrdersValidators,
  getUserOrderValidators,
  getUserOrderInvoiceValidators,
  cancelRequestValidators,
  claimRequestValidators,
  claimEvidenceUploadValidators,
  claimReturnShipmentValidators,
  claimEvidenceArrayValidator,
};
