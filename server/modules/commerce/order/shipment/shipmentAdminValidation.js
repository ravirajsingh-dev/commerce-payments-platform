const { body, param, query } = require("express-validator");
const { isValidOrderNoFormat } = require("../orderNumberGenerator");
const { STATUS_VALUES } = require("../../../../shared/constants/order");
const { FULFILLMENT_MODE_VALUES } = require("../../../../shared/constants/carrier");

const orderNoParam = () =>
  param("orderNo")
    .trim()
    .custom((value) => {
      if (!isValidOrderNoFormat(value)) {
        throw new Error("Invalid order number.");
      }
      return true;
    });

const eventIdParam = () => param("eventId").isMongoId().withMessage("Invalid event id.");

const shipmentBodyValidators = [
  body("fulfillmentMode")
    .optional()
    .isIn(FULFILLMENT_MODE_VALUES)
    .withMessage("Invalid fulfillment mode."),
  body("carrierId").optional().isMongoId(),
  body("trackingNumber").optional().isString().trim().isLength({ max: 80 }),
  body("estimatedDeliveryDate").optional({ values: "null" }).isISO8601().toDate(),
];

const createShipmentValidators = [
  orderNoParam(),
  body("fulfillmentMode")
    .optional()
    .isIn(FULFILLMENT_MODE_VALUES)
    .withMessage("Invalid fulfillment mode."),
  body("carrierId").isMongoId().withMessage("Carrier is required."),
  body("trackingNumber").optional().trim().isLength({ max: 80 }),
  body("estimatedDeliveryDate").optional().isISO8601().toDate(),
];

const updateShipmentValidators = [
  orderNoParam(),
  ...shipmentBodyValidators,
  body().custom((_, { req }) => {
    const { carrierId, trackingNumber, estimatedDeliveryDate, fulfillmentMode } =
      req.body || {};
    if (
      carrierId === undefined &&
      trackingNumber === undefined &&
      estimatedDeliveryDate === undefined &&
      fulfillmentMode === undefined
    ) {
      throw new Error("Provide at least one field to update.");
    }
    return true;
  }),
];

const listTrackingEventsValidators = [
  orderNoParam(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
];

const trackingEventBodyValidators = [
  body("status")
    .optional()
    .isIn(STATUS_VALUES.filter((value) => value !== "cancelled")),
  body("message").optional().isString().trim().isLength({ min: 1, max: 300 }),
  body("location").optional().isString().trim().isLength({ max: 120 }),
  body("note").optional().isString().trim().isLength({ max: 500 }),
  body("eventAt").optional().isISO8601().toDate(),
];

const createTrackingEventValidators = [
  orderNoParam(),
  body("status")
    .trim()
    .notEmpty()
    .isIn(STATUS_VALUES.filter((value) => value !== "cancelled")),
  body("message").trim().notEmpty().isLength({ max: 300 }),
  body("location").optional().isString().trim().isLength({ max: 120 }),
  body("note").optional().isString().trim().isLength({ max: 500 }),
  body("eventAt").isISO8601().toDate(),
];

const updateTrackingEventValidators = [
  orderNoParam(),
  eventIdParam(),
  ...trackingEventBodyValidators,
  body().custom((_, { req }) => {
    const { status, message, location, note, eventAt } = req.body || {};
    if (
      status === undefined &&
      message === undefined &&
      location === undefined &&
      note === undefined &&
      eventAt === undefined
    ) {
      throw new Error("Provide at least one field to update.");
    }
    return true;
  }),
];

const deleteTrackingEventValidators = [
  orderNoParam(),
  eventIdParam(),
  body("transactionConfirmed")
    .custom((value) => value === true)
    .withMessage("Explicit transaction confirmation is required."),
  body("confirmationText")
    .trim()
    .equals("DELETE_TRACKING_EVENT")
    .withMessage("Type DELETE_TRACKING_EVENT to confirm deletion."),
  body("deleteReason")
    .trim()
    .notEmpty()
    .withMessage("Delete reason is required.")
    .isLength({ max: 300 })
    .withMessage("Delete reason must be at most 300 characters."),
];

const getShipmentValidators = [orderNoParam()];

module.exports = {
  getShipmentValidators,
  createShipmentValidators,
  updateShipmentValidators,
  listTrackingEventsValidators,
  createTrackingEventValidators,
  updateTrackingEventValidators,
  deleteTrackingEventValidators,
};
