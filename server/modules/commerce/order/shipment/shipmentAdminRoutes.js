const express = require("express");
const { AdminAuth } = require("../../../../shared/middleware/auth");
const controller = require("./shipmentAdminController");
const {
  getShipmentValidators,
  createShipmentValidators,
  updateShipmentValidators,
  listTrackingEventsValidators,
  createTrackingEventValidators,
  updateTrackingEventValidators,
  deleteTrackingEventValidators,
} = require("./shipmentAdminValidation");

const router = express.Router({ mergeParams: true });

router.get("/", AdminAuth, getShipmentValidators, controller.getShipment);
router.post("/", AdminAuth, createShipmentValidators, controller.createShipment);
router.put("/", AdminAuth, updateShipmentValidators, controller.updateShipment);

router.get(
  "/events",
  AdminAuth,
  listTrackingEventsValidators,
  controller.listTrackingEvents,
);
router.post(
  "/events",
  AdminAuth,
  createTrackingEventValidators,
  controller.createTrackingEvent,
);
router.put(
  "/events/:eventId",
  AdminAuth,
  updateTrackingEventValidators,
  controller.updateTrackingEvent,
);
router.delete(
  "/events/:eventId",
  AdminAuth,
  deleteTrackingEventValidators,
  controller.deleteTrackingEvent,
);

module.exports = router;
