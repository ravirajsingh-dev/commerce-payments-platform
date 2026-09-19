const mongoose = require("mongoose");
const Order = require("../../../../models/Order");
const Shipment = require("../../../../models/Shipment");
const TrackingEvent = require("../../../../models/TrackingEvent");
const Carrier = require("../../../../models/Carrier");
const { isValidOrderNoFormat } = require("../orderNumberGenerator");
const { scheduleOrderShippedEmail } = require("../orderEmails");

const parsePagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};
const { buildCarrierTrackingLink } = require("./shipmentHelpers");
const {
  STATUS,
  STATUS_SET,
  ORDER_PAYMENT_METHOD,
  ORDER_PAYMENT_STATUS,
} = require("../../../../shared/constants/order");
const {
  FULFILLMENT_MODE,
  FULFILLMENT_MODE_SET,
  isOfflineFulfillmentMode,
} = require("../../../../shared/constants/carrier");

const SHIPMENT_ERROR = {
  INVALID_ORDER_NO: "INVALID_ORDER_NO",
  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  SHIPMENT_NOT_FOUND: "SHIPMENT_NOT_FOUND",
  SHIPMENT_EXISTS: "SHIPMENT_EXISTS",
  EVENT_NOT_FOUND: "EVENT_NOT_FOUND",
  INVALID_CARRIER: "INVALID_CARRIER",
  INVALID_FULFILLMENT_MODE: "INVALID_FULFILLMENT_MODE",
  INVALID_STATUS: "INVALID_STATUS",
  INVALID_TRACKING_NUMBER: "INVALID_TRACKING_NUMBER",
  INVALID_MESSAGE: "INVALID_MESSAGE",
  INVALID_LOCATION: "INVALID_LOCATION",
  INVALID_NOTE: "INVALID_NOTE",
  INVALID_EVENT_AT: "INVALID_EVENT_AT",
  DELETE_CONFIRMATION_REQUIRED: "DELETE_CONFIRMATION_REQUIRED",
  DELETE_REASON_REQUIRED: "DELETE_REASON_REQUIRED",
  NO_UPDATES: "NO_UPDATES",
};

const TRACKING_NUMBER_MAX = 80;
const MESSAGE_MAX = 300;
const LOCATION_MAX = 120;
const NOTE_MAX = 500;
const DELETE_REASON_MAX = 300;
const DELETE_CONFIRMATION_TEXT = "DELETE_TRACKING_EVENT";

const USER_TRACKING_EVENTS_PAGE = 1;
const USER_TRACKING_EVENTS_LIMIT = 50;

const toObjectId = (id) => new mongoose.Types.ObjectId(id);
const ONLINE_STATUS_REQUIRED_PREVIOUS = new Map([
  [
    STATUS.DELIVERED.value,
    new Set([STATUS.OUT_FOR_DELIVERY.value, STATUS.DELIVERY_ATTEMPTED.value]),
  ],
  [STATUS.RETURN_INITIATED.value, new Set([STATUS.DELIVERED.value])],
  [STATUS.RETURN_PICKED.value, new Set([STATUS.RETURN_INITIATED.value])],
  [STATUS.RETURN_COMPLETED.value, new Set([STATUS.RETURN_PICKED.value])],
]);

const normalizeOrderNo = (orderNo) => String(orderNo || "").trim().toUpperCase();
const isTransactionNotSupported = (err) => {
  const msg = String(err?.message || "").toLowerCase();
  return (
    err?.code === 20 ||
    msg.includes("replica set") ||
    msg.includes("mongos") ||
    msg.includes("transaction numbers are only allowed")
  );
};

const withOptionalTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    try {
      let result;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } catch (txErr) {
      if (!isTransactionNotSupported(txErr)) {
        throw txErr;
      }
      return work(null);
    }
  } finally {
    session.endSession();
  }
};

const invalidOrderNoResult = () => ({
  ok: false,
  code: SHIPMENT_ERROR.INVALID_ORDER_NO,
  message: "Invalid order number",
  errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
  statusCode: 400,
});

const orderNotFoundResult = () => ({
  ok: false,
  code: SHIPMENT_ERROR.ORDER_NOT_FOUND,
  message: "Order not found",
  errors: [{ path: "orderNo", msg: "Order not found." }],
  statusCode: 404,
});

const orderCancelledResult = () => ({
  ok: false,
  code: SHIPMENT_ERROR.ORDER_CANCELLED,
  message: "Order is cancelled",
  errors: [{ path: "orderNo", msg: "Cannot modify shipment for a cancelled order." }],
  statusCode: 400,
});

const shipmentNotFoundResult = () => ({
  ok: false,
  code: SHIPMENT_ERROR.SHIPMENT_NOT_FOUND,
  message: "Shipment not found",
  errors: [{ path: "shipment", msg: "Assign a shipment before managing tracking events." }],
  statusCode: 404,
});

const serializeTrackingEvent = (row) => ({
  id: String(row._id),
  status: row.status,
  location: row.location || "",
  message: row.message,
  note: row.note || "",
  eventAt: row.eventAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const serializeShipment = (shipment, carrierTrackingUrl = null) => ({
  id: String(shipment._id),
  orderId: String(shipment.orderId),
  orderNo: shipment.orderNo,
  carrierId: String(shipment.carrierId),
  carrierName: shipment.carrierName,
  fulfillmentMode: shipment.fulfillmentMode ?? null,
  trackingNumber: shipment.trackingNumber,
  estimatedDeliveryDate: shipment.estimatedDeliveryDate || null,
  currentStatus: shipment.currentStatus ?? null,
  latestStepMessage: shipment.latestStepMessage ?? null,
  latestStepLocation: shipment.latestStepLocation ?? null,
  latestStepAt: shipment.latestStepAt ?? null,
  carrierTrackingUrl: carrierTrackingUrl ?? null,
  createdAt: shipment.createdAt,
  updatedAt: shipment.updatedAt,
});

const serializeShipmentSummary = (shipment) => {
  if (!shipment) {
    return null;
  }
  return {
    carrierName: shipment.carrierName || "",
    trackingNumber: shipment.trackingNumber || "",
    currentStatus: shipment.currentStatus ?? null,
    latestStepMessage: shipment.latestStepMessage ?? null,
    latestStepAt: shipment.latestStepAt ?? null,
  };
};

const loadOrderByOrderNo = async (orderNo, { session } = {}) => {
  const normalizedOrderNo = normalizeOrderNo(orderNo);
  if (!isValidOrderNoFormat(normalizedOrderNo)) {
    return { ok: false, result: invalidOrderNoResult() };
  }

  const order = await Order.findOne({ orderNo: normalizedOrderNo }).session(
    session || null,
  );
  if (!order) {
    return { ok: false, result: orderNotFoundResult() };
  }

  return { ok: true, order, normalizedOrderNo };
};

const assertOrderNotCancelled = (order) => {
  if (order.status === STATUS.CANCELLED.value) {
    return orderCancelledResult();
  }
  return null;
};

const normalizeFulfillmentMode = (value) => {
  const normalized = String(value || FULFILLMENT_MODE.ONLINE.value).trim().toLowerCase();
  return FULFILLMENT_MODE_SET.has(normalized)
    ? normalized
    : FULFILLMENT_MODE.ONLINE.value;
};

const resolveActiveCarrier = async (carrierId, { fulfillmentMode } = {}) => {
  const id = String(carrierId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return {
      ok: false,
      code: SHIPMENT_ERROR.INVALID_CARRIER,
      message: "Invalid carrier",
      errors: [{ path: "carrierId", msg: "Invalid carrier id." }],
      statusCode: 400,
    };
  }

  const carrier = await Carrier.findById(id).lean();
  if (!carrier || !carrier.isActive) {
    return {
      ok: false,
      code: SHIPMENT_ERROR.INVALID_CARRIER,
      message: "Invalid carrier",
      errors: [{ path: "carrierId", msg: "Carrier not found or inactive." }],
      statusCode: 400,
    };
  }

  if (fulfillmentMode !== undefined) {
    const expected = normalizeFulfillmentMode(fulfillmentMode);
    const carrierMode = normalizeFulfillmentMode(carrier.fulfillmentMode);
    if (carrierMode !== expected) {
      return {
        ok: false,
        code: SHIPMENT_ERROR.INVALID_CARRIER,
        message: "Carrier does not match fulfillment mode",
        errors: [
          {
            path: "carrierId",
            msg: `Selected carrier is for ${carrierMode} fulfillment, not ${expected}.`,
          },
        ],
        statusCode: 400,
      };
    }
  }

  return { ok: true, carrier };
};

const resolveCarrierTrackingUrl = async (carrierId, { session } = {}) => {
  const carrier = await Carrier.findById(carrierId)
    .select("trackingUrl")
    .session(session || null)
    .lean();
  return carrier?.trackingUrl || null;
};

const validateTrackingNumber = (trackingNumber, { required = true, fallback = "" } = {}) => {
  const value = String(trackingNumber || "").trim();
  if (!value) {
    if (!required) {
      const fallbackValue = String(fallback || "").trim();
      if (fallbackValue) {
        return { ok: true, value: fallbackValue };
      }
      return { ok: true, value: "" };
    }
    return {
      ok: false,
      code: SHIPMENT_ERROR.INVALID_TRACKING_NUMBER,
      message: "Invalid tracking number",
      errors: [
        {
          path: "trackingNumber",
          msg: `Tracking number is required (max ${TRACKING_NUMBER_MAX} characters).`,
        },
      ],
      statusCode: 400,
    };
  }
  if (value.length > TRACKING_NUMBER_MAX) {
    return {
      ok: false,
      code: SHIPMENT_ERROR.INVALID_TRACKING_NUMBER,
      message: "Invalid tracking number",
      errors: [
        {
          path: "trackingNumber",
          msg: `Tracking number must be at most ${TRACKING_NUMBER_MAX} characters.`,
        },
      ],
      statusCode: 400,
    };
  }
  return { ok: true, value };
};

const validateEventStatus = (status) => {
  const value = String(status || "").trim().toLowerCase();
  if (!STATUS_SET.has(value) || value === STATUS.CANCELLED.value) {
    return {
      ok: false,
      code: SHIPMENT_ERROR.INVALID_STATUS,
      message: "Invalid tracking status",
      errors: [{ path: "status", msg: "Invalid tracking status." }],
      statusCode: 400,
    };
  }
  return { ok: true, value };
};

const buildInvalidOnlineTransitionResult = (fromStatus, toStatus) => ({
  ok: false,
  code: SHIPMENT_ERROR.INVALID_STATUS,
  message: "Invalid tracking status transition",
  errors: [
    {
      path: "status",
      msg: `Online shipment cannot move from '${fromStatus}' to '${toStatus}'.`,
    },
  ],
  statusCode: 400,
});

const assertOnlineStatusTransition = ({ shipment, fromStatus, toStatus }) => {
  if (!shipment || isOfflineFulfillmentMode(shipment.fulfillmentMode)) {
    return { ok: true };
  }

  if (!fromStatus || fromStatus === toStatus) {
    return { ok: true };
  }

  const requiredPrevious = ONLINE_STATUS_REQUIRED_PREVIOUS.get(toStatus);
  if (!requiredPrevious || requiredPrevious.has(fromStatus)) {
    return { ok: true };
  }

  return buildInvalidOnlineTransitionResult(fromStatus, toStatus);
};

const validateEventMessage = (message, { required = false } = {}) => {
  const value = String(message ?? "").trim();
  if (required && !value) {
    return {
      ok: false,
      code: SHIPMENT_ERROR.INVALID_MESSAGE,
      message: "Message is required",
      errors: [{ path: "message", msg: "Message is required." }],
      statusCode: 400,
    };
  }
  if (value.length > MESSAGE_MAX) {
    return {
      ok: false,
      code: SHIPMENT_ERROR.INVALID_MESSAGE,
      message: "Message is too long",
      errors: [{ path: "message", msg: `Message must be at most ${MESSAGE_MAX} characters.` }],
      statusCode: 400,
    };
  }
  return { ok: true, value };
};

const validateEventLocation = (location) => {
  const value = String(location ?? "").trim();
  if (value.length > LOCATION_MAX) {
    return {
      ok: false,
      code: SHIPMENT_ERROR.INVALID_LOCATION,
      message: "Location is too long",
      errors: [{ path: "location", msg: `Location must be at most ${LOCATION_MAX} characters.` }],
      statusCode: 400,
    };
  }
  return { ok: true, value };
};

const validateEventNote = (note) => {
  const value = String(note ?? "").trim();
  if (value.length > NOTE_MAX) {
    return {
      ok: false,
      code: SHIPMENT_ERROR.INVALID_NOTE,
      message: "Note is too long",
      errors: [{ path: "note", msg: `Note must be at most ${NOTE_MAX} characters.` }],
      statusCode: 400,
    };
  }
  return { ok: true, value };
};

const validateEventAt = (eventAt, { required = false } = {}) => {
  if (eventAt === undefined || eventAt === null || eventAt === "") {
    if (required) {
      return {
        ok: false,
        code: SHIPMENT_ERROR.INVALID_EVENT_AT,
        message: "Event date is required",
        errors: [{ path: "eventAt", msg: "Event date is required." }],
        statusCode: 400,
      };
    }
    return { ok: true, value: undefined };
  }

  const date = new Date(eventAt);
  if (Number.isNaN(date.getTime())) {
    return {
      ok: false,
      code: SHIPMENT_ERROR.INVALID_EVENT_AT,
      message: "Invalid event date",
      errors: [{ path: "eventAt", msg: "Event date must be a valid date." }],
      statusCode: 400,
    };
  }

  return { ok: true, value: date };
};

const parseEstimatedDeliveryDate = (value) => {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (value === null || value === "") {
    return { ok: true, value: null };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      ok: false,
      code: SHIPMENT_ERROR.INVALID_EVENT_AT,
      message: "Invalid estimated delivery date",
      errors: [
        {
          path: "estimatedDeliveryDate",
          msg: "Estimated delivery date must be a valid date.",
        },
      ],
      statusCode: 400,
    };
  }
  return { ok: true, value: date };
};

const validateDeleteConfirmation = (body = {}) => {
  const transactionConfirmed = body?.transactionConfirmed === true;
  const confirmationText = String(body?.confirmationText || "").trim();
  const deleteReason = String(body?.deleteReason || "").trim();

  if (!transactionConfirmed || confirmationText !== DELETE_CONFIRMATION_TEXT) {
    return {
      ok: false,
      code: SHIPMENT_ERROR.DELETE_CONFIRMATION_REQUIRED,
      message: "Explicit delete confirmation required",
      errors: [
        {
          path: "transactionConfirmed",
          msg: `Confirm deletion by setting transactionConfirmed=true and confirmationText='${DELETE_CONFIRMATION_TEXT}'.`,
        },
      ],
      statusCode: 400,
    };
  }

  if (!deleteReason) {
    return {
      ok: false,
      code: SHIPMENT_ERROR.DELETE_REASON_REQUIRED,
      message: "Delete reason is required",
      errors: [
        {
          path: "deleteReason",
          msg: "Please provide a deletion reason for audit trail.",
        },
      ],
      statusCode: 400,
    };
  }

  if (deleteReason.length > DELETE_REASON_MAX) {
    return {
      ok: false,
      code: SHIPMENT_ERROR.DELETE_REASON_REQUIRED,
      message: "Delete reason is too long",
      errors: [
        {
          path: "deleteReason",
          msg: `Delete reason must be at most ${DELETE_REASON_MAX} characters.`,
        },
      ],
      statusCode: 400,
    };
  }

  return { ok: true, deleteReason };
};

/**
 * Latest tracking event by eventAt (desc).
 */
const syncShipmentSummary = async (shipmentId, { session } = {}) => {
  const shipment = await Shipment.findById(shipmentId).session(session || null);
  if (!shipment) {
    return null;
  }

  const latest = await TrackingEvent.findOne({ shipmentId: shipment._id })
    .session(session || null)
    .sort({ eventAt: -1, createdAt: -1 })
    .lean();

  if (!latest) {
    shipment.currentStatus = null;
    shipment.latestEventId = null;
    shipment.latestStepMessage = null;
    shipment.latestStepLocation = null;
    shipment.latestStepAt = null;
  } else {
    shipment.currentStatus = latest.status;
    shipment.latestEventId = latest._id;
    shipment.latestStepMessage = latest.message;
    shipment.latestStepLocation = latest.location || null;
    shipment.latestStepAt = latest.eventAt;
  }

  await shipment.save(session ? { session } : {});
  return shipment;
};

/**
 * Set order.status from the latest tracking event when one exists.
 */
const syncOrderStatusFromLatestEvent = async (orderId, { session } = {}) => {
  const order = await Order.findById(orderId).session(session || null);
  if (!order) {
    return null;
  }

  const latest = await TrackingEvent.findOne({ orderId: order._id })
    .session(session || null)
    .sort({ eventAt: -1, createdAt: -1 })
    .lean();

  if (!latest) {
    return order;
  }

  const previousStatus = order.status;
  const previousPaymentStatus = order.paymentStatus;
  if (latest.status !== order.status) {
    order.status = latest.status;
    if (
      order.status === STATUS.DELIVERED.value &&
      order.paymentMethod === ORDER_PAYMENT_METHOD.COD &&
      order.paymentStatus !== ORDER_PAYMENT_STATUS.COD_PAID
    ) {
      order.paymentStatus = ORDER_PAYMENT_STATUS.COD_PAID;
    }
    await order.save(session ? { session } : {});

    if (
      previousStatus !== STATUS.SHIPPED.value &&
      order.status === STATUS.SHIPPED.value
    ) {
      const shipment = await Shipment.findOne({ orderId: order._id })
        .session(session || null)
        .lean();
      const carrierTrackingUrl = shipment
        ? await resolveCarrierTrackingUrl(shipment.carrierId, { session })
        : null;
      scheduleOrderShippedEmail(order, previousStatus, {
        carrierName: shipment?.carrierName || "",
        trackingNumber: shipment?.trackingNumber || "",
        carrierTrackingUrl: buildCarrierTrackingLink(
          carrierTrackingUrl,
          shipment?.trackingNumber,
        ),
      });
    }
  }

  if (
    previousStatus === order.status &&
    order.status === STATUS.DELIVERED.value &&
    order.paymentMethod === ORDER_PAYMENT_METHOD.COD &&
    previousPaymentStatus !== ORDER_PAYMENT_STATUS.COD_PAID
  ) {
    order.paymentStatus = ORDER_PAYMENT_STATUS.COD_PAID;
    await order.save(session ? { session } : {});
  }

  return order;
};

const loadShipmentsByOrderIds = async (orderIds) => {
  if (!orderIds.length) {
    return new Map();
  }

  const rows = await Shipment.find({
    orderId: { $in: orderIds.map((id) => toObjectId(id)) },
  }).lean();

  return new Map(rows.map((row) => [String(row.orderId), row]));
};

const getShipmentByOrderNo = async (orderNo) => {
  const loaded = await loadOrderByOrderNo(orderNo);
  if (!loaded.ok) {
    return loaded.result;
  }

  const shipment = await Shipment.findOne({ orderId: loaded.order._id }).lean();
  if (!shipment) {
    return {
      ok: true,
      shipment: null,
    };
  }

  let shipmentRow = shipment;
  if (!shipmentRow.fulfillmentMode && shipmentRow.carrierId) {
    const carrier = await Carrier.findById(shipmentRow.carrierId)
      .select("fulfillmentMode")
      .lean();
    if (carrier?.fulfillmentMode) {
      shipmentRow = { ...shipmentRow, fulfillmentMode: carrier.fulfillmentMode };
    }
  }

  const carrierTrackingUrl = await resolveCarrierTrackingUrl(shipmentRow.carrierId);

  return {
    ok: true,
    shipment: serializeShipment(shipmentRow, carrierTrackingUrl),
  };
};

const createShipment = async (orderNo, body = {}) => {
  return withOptionalTransaction(async (session) => {
    const loaded = await loadOrderByOrderNo(orderNo, { session });
    if (!loaded.ok) {
      return loaded.result;
    }

    const cancelled = assertOrderNotCancelled(loaded.order);
    if (cancelled) {
      return cancelled;
    }

    const existing = await Shipment.exists({ orderId: loaded.order._id }).session(
      session || null,
    );
    if (existing) {
      return {
        ok: false,
        code: SHIPMENT_ERROR.SHIPMENT_EXISTS,
        message: "Shipment already exists",
        errors: [{ path: "shipment", msg: "A shipment is already assigned to this order." }],
        statusCode: 409,
      };
    }

    const fulfillmentMode = normalizeFulfillmentMode(body.fulfillmentMode);
    const carrierResult = await resolveActiveCarrier(body.carrierId, { fulfillmentMode });
    if (!carrierResult.ok) {
      return carrierResult;
    }

    const offlineCarrier = isOfflineFulfillmentMode(carrierResult.carrier.fulfillmentMode);
    const trackingResult = validateTrackingNumber(body.trackingNumber, {
      required: !offlineCarrier,
      fallback: loaded.normalizedOrderNo,
    });
    if (!trackingResult.ok) {
      return trackingResult;
    }

    const trackingNumber =
      trackingResult.value || (offlineCarrier ? loaded.normalizedOrderNo : "");

    if (!trackingNumber) {
      return {
        ok: false,
        code: SHIPMENT_ERROR.INVALID_TRACKING_NUMBER,
        message: "Invalid tracking number",
        errors: [{ path: "trackingNumber", msg: "Tracking number is required." }],
        statusCode: 400,
      };
    }

    const estimatedResult = parseEstimatedDeliveryDate(body.estimatedDeliveryDate);
    if (!estimatedResult.ok) {
      return estimatedResult;
    }

    const shipment = new Shipment({
      orderId: loaded.order._id,
      orderNo: loaded.normalizedOrderNo,
      carrierId: carrierResult.carrier._id,
      carrierName: carrierResult.carrier.name,
      fulfillmentMode,
      trackingNumber,
      estimatedDeliveryDate:
        estimatedResult.value === undefined ? null : estimatedResult.value,
    });
    await shipment.save(session ? { session } : {});

    const carrierTrackingUrl = carrierResult.carrier.trackingUrl || null;

    return {
      ok: true,
      shipment: serializeShipment(shipment.toObject(), carrierTrackingUrl),
    };
  });
};

const updateShipment = async (orderNo, body = {}) => {
  return withOptionalTransaction(async (session) => {
    const loaded = await loadOrderByOrderNo(orderNo, { session });
    if (!loaded.ok) {
      return loaded.result;
    }

    const cancelled = assertOrderNotCancelled(loaded.order);
    if (cancelled) {
      return cancelled;
    }

    const shipment = await Shipment.findOne({ orderId: loaded.order._id }).session(
      session || null,
    );
    if (!shipment) {
      return shipmentNotFoundResult();
    }

    const updates = {};

    const fulfillmentMode =
      body.fulfillmentMode !== undefined
        ? normalizeFulfillmentMode(body.fulfillmentMode)
        : normalizeFulfillmentMode(shipment.fulfillmentMode);

    if (body.fulfillmentMode !== undefined) {
      updates.fulfillmentMode = fulfillmentMode;
    }

    if (body.carrierId !== undefined) {
      const carrierResult = await resolveActiveCarrier(body.carrierId, {
        fulfillmentMode,
      });
      if (!carrierResult.ok) {
        return carrierResult;
      }
      updates.carrierId = carrierResult.carrier._id;
      updates.carrierName = carrierResult.carrier.name;
      updates.fulfillmentMode = normalizeFulfillmentMode(
        carrierResult.carrier.fulfillmentMode,
      );
    }

    if (body.trackingNumber !== undefined) {
      const carrier =
        updates.carrierId !== undefined
          ? await Carrier.findById(updates.carrierId).session(session || null).lean()
          : await Carrier.findById(shipment.carrierId).session(session || null).lean();
      const offlineCarrier = isOfflineFulfillmentMode(
        updates.fulfillmentMode ?? carrier?.fulfillmentMode,
      );
      const trackingResult = validateTrackingNumber(body.trackingNumber, {
        required: !offlineCarrier,
        fallback: loaded.normalizedOrderNo,
      });
      if (!trackingResult.ok) {
        return trackingResult;
      }
      const nextTracking =
        trackingResult.value || (offlineCarrier ? loaded.normalizedOrderNo : "");
      if (!nextTracking) {
        return {
          ok: false,
          code: SHIPMENT_ERROR.INVALID_TRACKING_NUMBER,
          message: "Invalid tracking number",
          errors: [{ path: "trackingNumber", msg: "Tracking number is required." }],
          statusCode: 400,
        };
      }
      updates.trackingNumber = nextTracking;
    }

    if (body.estimatedDeliveryDate !== undefined) {
      const estimatedResult = parseEstimatedDeliveryDate(body.estimatedDeliveryDate);
      if (!estimatedResult.ok) {
        return estimatedResult;
      }
      updates.estimatedDeliveryDate = estimatedResult.value;
    }

    if (Object.keys(updates).length === 0) {
      return {
        ok: false,
        code: SHIPMENT_ERROR.NO_UPDATES,
        message: "No updates provided",
        errors: [
          {
            path: "body",
            msg: "Provide carrierId, trackingNumber, or estimatedDeliveryDate.",
          },
        ],
        statusCode: 400,
      };
    }

    Object.assign(shipment, updates);
    await shipment.save(session ? { session } : {});

    const carrierTrackingUrl = await resolveCarrierTrackingUrl(shipment.carrierId, {
      session,
    });

    return {
      ok: true,
      shipment: serializeShipment(shipment.toObject(), carrierTrackingUrl),
    };
  });
};

const listTrackingEvents = async (orderNo, query = {}) => {
  const loaded = await loadOrderByOrderNo(orderNo);
  if (!loaded.ok) {
    return loaded.result;
  }

  const shipment = await Shipment.findOne({ orderId: loaded.order._id }).lean();
  if (!shipment) {
    return shipmentNotFoundResult();
  }

  const { page, limit, skip } = parsePagination(query);

  const filter = { shipmentId: shipment._id };
  const [total, events] = await Promise.all([
    TrackingEvent.countDocuments(filter),
    TrackingEvent.find(filter)
      .sort({ eventAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    ok: true,
    events: events.map(serializeTrackingEvent),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

const listTrackingEventsForShipment = async (shipmentId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { shipmentId: toObjectId(shipmentId) };

  const [total, events] = await Promise.all([
    TrackingEvent.countDocuments(filter),
    TrackingEvent.find(filter)
      .sort({ eventAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    events: events.map(serializeTrackingEvent),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

const createTrackingEvent = async (orderNo, body = {}) => {
  return withOptionalTransaction(async (session) => {
    const loaded = await loadOrderByOrderNo(orderNo, { session });
    if (!loaded.ok) {
      return loaded.result;
    }

    const cancelled = assertOrderNotCancelled(loaded.order);
    if (cancelled) {
      return cancelled;
    }

    const shipment = await Shipment.findOne({ orderId: loaded.order._id }).session(
      session || null,
    );
    if (!shipment) {
      return shipmentNotFoundResult();
    }

    const statusResult = validateEventStatus(body.status);
    if (!statusResult.ok) {
      return statusResult;
    }

    const messageResult = validateEventMessage(body.message, { required: true });
    if (!messageResult.ok) {
      return messageResult;
    }

    const locationResult = validateEventLocation(body.location);
    if (!locationResult.ok) {
      return locationResult;
    }

    const noteResult = validateEventNote(body.note);
    if (!noteResult.ok) {
      return noteResult;
    }

    const eventAtResult = validateEventAt(body.eventAt, { required: true });
    if (!eventAtResult.ok) {
      return eventAtResult;
    }

    const latest = await TrackingEvent.findOne({ shipmentId: shipment._id })
      .session(session || null)
      .sort({ eventAt: -1, createdAt: -1 })
      .lean();
    const incomingEventAtMs = eventAtResult.value.getTime();
    const latestEventAtMs = latest?.eventAt ? new Date(latest.eventAt).getTime() : null;
    const incomingBecomesLatest =
      latestEventAtMs === null || incomingEventAtMs >= latestEventAtMs;

    if (incomingBecomesLatest) {
      const transitionCheck = assertOnlineStatusTransition({
        shipment,
        fromStatus: latest?.status || loaded.order.status,
        toStatus: statusResult.value,
      });
      if (!transitionCheck.ok) {
        return transitionCheck;
      }
    }

    const event = new TrackingEvent({
      shipmentId: shipment._id,
      orderId: loaded.order._id,
      status: statusResult.value,
      message: messageResult.value,
      location: locationResult.value,
      note: noteResult.value,
      eventAt: eventAtResult.value,
    });
    await event.save(session ? { session } : {});

    await syncShipmentSummary(shipment._id, { session });
    await syncOrderStatusFromLatestEvent(loaded.order._id, { session });

    const refreshed = await Shipment.findById(shipment._id)
      .session(session || null)
      .lean();
    const carrierTrackingUrl = await resolveCarrierTrackingUrl(refreshed.carrierId, {
      session,
    });

    return {
      ok: true,
      event: serializeTrackingEvent(event.toObject()),
      shipment: serializeShipment(refreshed, carrierTrackingUrl),
    };
  });
};

const updateTrackingEvent = async (orderNo, eventId, body = {}) => {
  return withOptionalTransaction(async (session) => {
    const loaded = await loadOrderByOrderNo(orderNo, { session });
    if (!loaded.ok) {
      return loaded.result;
    }

    const cancelled = assertOrderNotCancelled(loaded.order);
    if (cancelled) {
      return cancelled;
    }

    const shipment = await Shipment.findOne({ orderId: loaded.order._id }).session(
      session || null,
    );
    if (!shipment) {
      return shipmentNotFoundResult();
    }

    const event = await TrackingEvent.findOne({
      _id: eventId,
      shipmentId: shipment._id,
    }).session(session || null);

    if (!event) {
      return {
        ok: false,
        code: SHIPMENT_ERROR.EVENT_NOT_FOUND,
        message: "Tracking event not found",
        errors: [{ path: "eventId", msg: "Tracking event not found." }],
        statusCode: 404,
      };
    }

    const updates = {};

    if (body.status !== undefined) {
      const statusResult = validateEventStatus(body.status);
      if (!statusResult.ok) {
        return statusResult;
      }
      updates.status = statusResult.value;
    }

    if (body.message !== undefined) {
      const messageResult = validateEventMessage(body.message, { required: true });
      if (!messageResult.ok) {
        return messageResult;
      }
      updates.message = messageResult.value;
    }

    if (body.location !== undefined) {
      const locationResult = validateEventLocation(body.location);
      if (!locationResult.ok) {
        return locationResult;
      }
      updates.location = locationResult.value;
    }

    if (body.note !== undefined) {
      const noteResult = validateEventNote(body.note);
      if (!noteResult.ok) {
        return noteResult;
      }
      updates.note = noteResult.value;
    }

    if (body.eventAt !== undefined) {
      const eventAtResult = validateEventAt(body.eventAt, { required: true });
      if (!eventAtResult.ok) {
        return eventAtResult;
      }
      updates.eventAt = eventAtResult.value;
    }

    if (Object.keys(updates).length === 0) {
      return {
        ok: false,
        code: SHIPMENT_ERROR.NO_UPDATES,
        message: "No updates provided",
        errors: [{ path: "body", msg: "Provide at least one field to update." }],
        statusCode: 400,
      };
    }

    const candidateEventAt = updates.eventAt || event.eventAt;
    const candidateStatus = updates.status || event.status;
    const candidateEventAtMs = new Date(candidateEventAt).getTime();
    const latestOther = await TrackingEvent.findOne({
      shipmentId: shipment._id,
      _id: { $ne: event._id },
    })
      .session(session || null)
      .sort({ eventAt: -1, createdAt: -1 })
      .lean();
    const latestOtherEventAtMs = latestOther?.eventAt
      ? new Date(latestOther.eventAt).getTime()
      : null;
    const candidateBecomesLatest =
      latestOtherEventAtMs === null ||
      candidateEventAtMs > latestOtherEventAtMs ||
      (candidateEventAtMs === latestOtherEventAtMs &&
        new Date(event.createdAt).getTime() >= new Date(latestOther.createdAt).getTime());

    if (candidateBecomesLatest) {
      const transitionCheck = assertOnlineStatusTransition({
        shipment,
        fromStatus: latestOther?.status || loaded.order.status,
        toStatus: candidateStatus,
      });
      if (!transitionCheck.ok) {
        return transitionCheck;
      }
    }

    Object.assign(event, updates);
    await event.save(session ? { session } : {});

    await syncShipmentSummary(shipment._id, { session });
    await syncOrderStatusFromLatestEvent(loaded.order._id, { session });

    const refreshed = await Shipment.findById(shipment._id)
      .session(session || null)
      .lean();
    const carrierTrackingUrl = await resolveCarrierTrackingUrl(refreshed.carrierId, {
      session,
    });

    return {
      ok: true,
      event: serializeTrackingEvent(event.toObject()),
      shipment: serializeShipment(refreshed, carrierTrackingUrl),
    };
  });
};

const deleteTrackingEvent = async (orderNo, eventId, body = {}, options = {}) => {
  const confirmationResult = validateDeleteConfirmation(body);
  if (!confirmationResult.ok) {
    return confirmationResult;
  }

  return withOptionalTransaction(async (session) => {
    const loaded = await loadOrderByOrderNo(orderNo, { session });
    if (!loaded.ok) {
      return loaded.result;
    }

    const cancelled = assertOrderNotCancelled(loaded.order);
    if (cancelled) {
      return cancelled;
    }

    const shipment = await Shipment.findOne({ orderId: loaded.order._id }).session(
      session || null,
    );
    if (!shipment) {
      return shipmentNotFoundResult();
    }

    const event = await TrackingEvent.findOneAndDelete({
      _id: eventId,
      shipmentId: shipment._id,
    }).session(session || null);

    if (!event) {
      return {
        ok: false,
        code: SHIPMENT_ERROR.EVENT_NOT_FOUND,
        message: "Tracking event not found",
        errors: [{ path: "eventId", msg: "Tracking event not found." }],
        statusCode: 404,
      };
    }

    await syncShipmentSummary(shipment._id, { session });
    await syncOrderStatusFromLatestEvent(loaded.order._id, { session });

    console.info("deleteTrackingEvent.audit", {
      orderNo: loaded.normalizedOrderNo,
      eventId: String(event._id),
      actorId: options.actorId || null,
      reason: confirmationResult.deleteReason,
      transactionConfirmed: true,
      confirmationText: DELETE_CONFIRMATION_TEXT,
      at: new Date().toISOString(),
    });

    const refreshed = await Shipment.findById(shipment._id)
      .session(session || null)
      .lean();
    const carrierTrackingUrl = refreshed
      ? await resolveCarrierTrackingUrl(refreshed.carrierId, { session })
      : null;

    return {
      ok: true,
      shipment: refreshed ? serializeShipment(refreshed, carrierTrackingUrl) : null,
    };
  });
};

const getUserOrderShipmentPayload = async (orderId) => {
  const shipment = await Shipment.findOne({ orderId }).lean();
  if (!shipment) {
    return { shipment: null, trackingEvents: [], trackingPagination: null };
  }

  const carrierTrackingUrl = await resolveCarrierTrackingUrl(shipment.carrierId);
  const { events, pagination } = await listTrackingEventsForShipment(shipment._id, {
    page: USER_TRACKING_EVENTS_PAGE,
    limit: USER_TRACKING_EVENTS_LIMIT,
  });

  return {
    shipment: serializeShipment(shipment, carrierTrackingUrl),
    trackingEvents: events,
    trackingPagination: pagination,
  };
};

module.exports = {
  SHIPMENT_ERROR,
  DELETE_CONFIRMATION_TEXT,
  serializeShipment,
  serializeShipmentSummary,
  serializeTrackingEvent,
  loadShipmentsByOrderIds,
  getShipmentByOrderNo,
  createShipment,
  updateShipment,
  listTrackingEvents,
  createTrackingEvent,
  updateTrackingEvent,
  deleteTrackingEvent,
  syncShipmentSummary,
  syncOrderStatusFromLatestEvent,
  getUserOrderShipmentPayload,
};
