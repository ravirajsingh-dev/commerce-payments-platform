import { STATUS, label } from "@src/constants/order";
import { sortTrackingEventsChronological } from "@src/utils/shipmentDisplayHelpers";
import { hasOpenOrderClaim } from "@src/utils/orderTrackingHelpers";

/** Fulfillment path — same STATUS rows as server, logical delivery order. */
const FULFILLMENT_STATUSES = [
  STATUS.ORDER_PLACED,
  STATUS.PAYMENT_CONFIRMED,
  STATUS.ORDER_CONFIRMED,
  STATUS.PACKED,
  STATUS.SHIPPED,
  STATUS.HUB_RECEIVED,
  STATUS.IN_TRANSIT,
  STATUS.OUT_FOR_DELIVERY,
  STATUS.DELIVERY_ATTEMPTED,
  STATUS.DELIVERED,
];

const RETURN_STATUSES = [
  STATUS.RETURN_INITIATED,
  STATUS.RETURN_PICKED,
  STATUS.RETURN_COMPLETED,
];

const RETURN_STATUS_SET = new Set(RETURN_STATUSES.map((row) => row.value));

const pickTimelineStatuses = (effectiveStatus) => {
  if (RETURN_STATUS_SET.has(effectiveStatus)) {
    return [...FULFILLMENT_STATUSES, ...RETURN_STATUSES];
  }
  return FULFILLMENT_STATUSES;
};

const indexOfStatus = (rows, status) => {
  const idx = rows.findIndex((row) => row.value === status);
  return idx >= 0 ? idx : 0;
};

const groupEventsByStatus = (events) => {
  const map = {};
  sortTrackingEventsChronological(events).forEach((event) => {
    if (!map[event.status]) {
      map[event.status] = [];
    }
    map[event.status].push(event);
  });
  return map;
};

const latestEvent = (statusEvents = []) =>
  statusEvents.length > 0 ? statusEvents[statusEvents.length - 1] : null;

/**
 * @returns {Array<{ status, label, state, eventAt, message, location, events }>}
 */
export const buildOrderTrackingTimeline = ({
  orderStatus,
  orderCreatedAt = null,
  events = [],
  shipment = null,
  claim = null,
} = {}) => {
  const hasOpenClaim = hasOpenOrderClaim(claim);
  const sourceStatus = shipment?.currentStatus || orderStatus || STATUS.ORDER_PLACED.value;
  const effectiveStatus =
    hasOpenClaim && RETURN_STATUS_SET.has(sourceStatus)
      ? STATUS.DELIVERED.value
      : sourceStatus;
  const rows = pickTimelineStatuses(effectiveStatus);
  const currentIdx = indexOfStatus(rows, effectiveStatus);
  const eventsByStatus = groupEventsByStatus(events);
  const isDelivered = effectiveStatus === STATUS.DELIVERED.value;
  const isReturnDone = effectiveStatus === STATUS.RETURN_COMPLETED.value;

  return rows.map((row, index) => {
    const statusEvents = eventsByStatus[row.value] || [];
    const event = latestEvent(statusEvents);
    let eventAt = event?.eventAt ?? null;
    const message = event?.message?.trim() || null;
    const location = event?.location?.trim() || null;

    if (row.value === STATUS.ORDER_PLACED.value && !eventAt && orderCreatedAt) {
      eventAt = orderCreatedAt;
    }

    const isCurrent =
      !isDelivered && !isReturnDone && index === currentIdx;
    const isCompleted =
      isDelivered || isReturnDone
        ? index <= currentIdx
        : index < currentIdx;

    let state = "pending";
    if (isCompleted) {
      state = "completed";
    } else if (isCurrent) {
      state = "current";
    }

    const showDetails = state === "completed" || state === "current";

    return {
      status: row.value,
      label: row.label,
      state,
      eventAt: showDetails ? eventAt : null,
      message: showDetails ? message : null,
      location: showDetails && location ? location : null,
      events: showDetails ? statusEvents : [],
    };
  });
};

export const getTrackingHeadline = ({ shipment, orderStatus, timeline = [] }) => {
  const fromShipment = String(shipment?.latestStepMessage || "").trim();
  if (fromShipment) {
    return fromShipment;
  }
  const current = timeline.find((step) => step.state === "current");
  if (current?.message) {
    return current.message;
  }
  const effectiveStatus = shipment?.currentStatus || orderStatus;
  return effectiveStatus ? label(effectiveStatus) : "";
};
