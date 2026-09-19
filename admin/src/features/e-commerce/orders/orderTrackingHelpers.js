import { STATUS, STATUS_LIST, label } from "@src/constants/order";

const FULFILLMENT_VALUES = [
  STATUS.ORDER_PLACED.value,
  STATUS.PAYMENT_CONFIRMED.value,
  STATUS.ORDER_CONFIRMED.value,
  STATUS.PACKED.value,
  STATUS.SHIPPED.value,
  STATUS.HUB_RECEIVED.value,
  STATUS.IN_TRANSIT.value,
  STATUS.OUT_FOR_DELIVERY.value,
  STATUS.DELIVERY_ATTEMPTED.value,
  STATUS.DELIVERED.value,
];

const RETURN_VALUES = [
  STATUS.RETURN_INITIATED.value,
  STATUS.RETURN_PICKED.value,
  STATUS.RETURN_COMPLETED.value,
];

const RETURN_STATUS_SET = new Set(RETURN_VALUES);

const sortEvents = (events = []) =>
  [...events].sort((a, b) => new Date(a.eventAt) - new Date(b.eventAt));

const timelineRowsFor = (effectiveStatus) => {
  const values = RETURN_STATUS_SET.has(effectiveStatus)
    ? [...FULFILLMENT_VALUES, ...RETURN_VALUES]
    : FULFILLMENT_VALUES;
  return values.map(
    (value) => STATUS_LIST.find((row) => row.value === value) || { value, label: label(value) },
  );
};

const groupEventsByStatus = (events) => {
  const map = {};
  sortEvents(events).forEach((event) => {
    if (!map[event.status]) {
      map[event.status] = [];
    }
    map[event.status].push(event);
  });
  return map;
};

const latestEvent = (statusEvents = []) =>
  statusEvents.length > 0 ? statusEvents[statusEvents.length - 1] : null;

export const buildOrderTrackingTimeline = ({
  orderStatus,
  orderCreatedAt = null,
  events = [],
  shipment = null,
} = {}) => {
  const effectiveStatus =
    shipment?.currentStatus || orderStatus || STATUS.ORDER_PLACED.value;
  const rows = timelineRowsFor(effectiveStatus);
  const currentIdx = rows.findIndex((row) => row.value === effectiveStatus);
  const safeIdx = currentIdx >= 0 ? currentIdx : 0;
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

    const isCurrent = !isDelivered && !isReturnDone && index === safeIdx;
    const isCompleted =
      isDelivered || isReturnDone
        ? index <= safeIdx
        : index < safeIdx;

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
