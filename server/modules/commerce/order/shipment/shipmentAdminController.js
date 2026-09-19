const { validationResult } = require("express-validator");
const response = require("../../../../config/response");
const service = require("./shipmentService");

const handleServiceFailure = (res, result, fallbackMessage) =>
  response.errorResponse(
    res,
    result.errors || {},
    result.message || fallbackMessage,
    result.statusCode || 400,
  );

const getShipment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.getShipmentByOrderNo(req.params.orderNo);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to fetch shipment.");
    }

    return response.successResponse(res, { shipment: result.shipment }, "Shipment fetched.");
  } catch (err) {
    console.error("getShipment:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const createShipment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.createShipment(req.params.orderNo, req.body);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to create shipment.");
    }

    return response.successResponse(
      res,
      { shipment: result.shipment },
      "Shipment assigned.",
      201,
    );
  } catch (err) {
    console.error("createShipment:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const updateShipment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.updateShipment(req.params.orderNo, req.body);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to update shipment.");
    }

    return response.successResponse(res, { shipment: result.shipment }, "Shipment updated.");
  } catch (err) {
    console.error("updateShipment:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const listTrackingEvents = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.listTrackingEvents(req.params.orderNo, req.query);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to fetch tracking events.");
    }

    return response.successResponse(
      res,
      {
        events: result.events,
        pagination: result.pagination,
      },
      "Tracking events fetched.",
    );
  } catch (err) {
    console.error("listTrackingEvents:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const createTrackingEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.createTrackingEvent(req.params.orderNo, req.body);
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to create tracking event.");
    }

    return response.successResponse(
      res,
      {
        event: result.event,
        shipment: result.shipment,
      },
      "Tracking event created.",
      201,
    );
  } catch (err) {
    console.error("createTrackingEvent:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const updateTrackingEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.updateTrackingEvent(
      req.params.orderNo,
      req.params.eventId,
      req.body,
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to update tracking event.");
    }

    return response.successResponse(
      res,
      {
        event: result.event,
        shipment: result.shipment,
      },
      "Tracking event updated.",
    );
  } catch (err) {
    console.error("updateTrackingEvent:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const deleteTrackingEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.deleteTrackingEvent(
      req.params.orderNo,
      req.params.eventId,
      req.body,
      { actorId: req.user?.id },
    );
    if (!result.ok) {
      return handleServiceFailure(res, result, "Unable to delete tracking event.");
    }

    return response.successResponse(
      res,
      { shipment: result.shipment },
      "Tracking event deleted.",
    );
  } catch (err) {
    console.error("deleteTrackingEvent:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

module.exports = {
  getShipment,
  createShipment,
  updateShipment,
  listTrackingEvents,
  createTrackingEvent,
  updateTrackingEvent,
  deleteTrackingEvent,
};
