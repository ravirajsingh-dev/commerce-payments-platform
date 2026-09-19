import api from "@src/utils/axiosSetup";
import { STATUS, STATUS_LIST, label } from "@src/constants/order";
import {
  FULFILLMENT_MODE,
  FULFILLMENT_MODE_LIST,
  fulfillmentModeLabel,
  isOfflineFulfillmentMode,
} from "@src/constants/carrier";

export { fulfillmentModeLabel, isOfflineFulfillmentMode };

export { label };

/** Tracking events must not use cancelled. */
const TRACKING_EVENT_STATUS_OPTIONS = STATUS_LIST.filter(
  (row) => row.value !== STATUS.CANCELLED.value,
);

export const loadTrackingEventStatusOptions = async ({
  excludedValues = [],
  includeValues = [],
} = {}) => {
  const excluded = new Set(excludedValues);
  const included = new Set(includeValues);
  return TRACKING_EVENT_STATUS_OPTIONS.filter(
    (row) => !excluded.has(row.value) || included.has(row.value),
  ).map((row) => ({
    value: row.value,
    label: row.label,
  }));
};

export const buildCarrierTrackingLink = (trackingUrl, trackingNumber) => {
  const url = String(trackingUrl || "").trim();
  const awb = String(trackingNumber || "").trim();
  if (!url || !awb) {
    return null;
  }
  return url.replace(/\{trackingNumber\}/gi, awb).replace(/\{awb\}/gi, awb);
};

export const formatTrackingDateTime = (value) => {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  try {
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export const openCarrierTracking = (trackingUrl, trackingNumber) => {
  const href = buildCarrierTrackingLink(trackingUrl, trackingNumber);
  if (!href) {
    return false;
  }
  window.open(href, "_blank", "noopener,noreferrer");
  return true;
};

const extractCarriersFromListResponse = (responseData) => {
  const bucket = responseData?.[0] || {};
  return bucket?.data || [];
};

export const loadFulfillmentModeOptions = async () =>
  FULFILLMENT_MODE_LIST.map((row) => ({
    value: row.value,
    label: row.label,
  }));

export const findFulfillmentModeOption = (value) => {
  const normalized = String(value || FULFILLMENT_MODE.ONLINE.value).trim();
  const row = FULFILLMENT_MODE_LIST.find((item) => item.value === normalized);
  return row ? { value: row.value, label: row.label } : null;
};

export const loadActiveCarrierOptions = async (fulfillmentMode = FULFILLMENT_MODE.ONLINE.value) => {
  const mode = String(fulfillmentMode || FULFILLMENT_MODE.ONLINE.value).trim();
  const res = await api.get("/api/admin/carriers/list", {
    params: {
      limit: 100,
      page: 1,
      orderBy: "name",
      ascending: "asc",
      filters: "isActive,fulfillmentMode",
      query: JSON.stringify({
        isActive: { value: true, type: "Boolean" },
        fulfillmentMode: { value: mode, type: "String" },
      }),
    },
    allowDuplicates: true,
  });

  if (!res.data?.status) {
    return [];
  }

  return extractCarriersFromListResponse(res.data.response).map((carrier) => ({
    value: String(carrier._id),
    label: carrier.name,
  }));
};

export const findTrackingStatusOption = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }
  const row = TRACKING_EVENT_STATUS_OPTIONS.find((item) => item.value === normalized);
  return row ? { value: row.value, label: row.label } : { value: normalized, label: label(normalized) };
};

const formatEventAtForInput = (value) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const eventAtInputToIso = (value) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
};

export const emptyShipmentAssignForm = () => ({
  fulfillmentMode: FULFILLMENT_MODE.ONLINE.value,
  carrierId: "",
  trackingNumber: "",
  estimatedDeliveryDate: "",
});

export const shipmentToAssignForm = (shipment = null) => {
  if (!shipment) {
    return emptyShipmentAssignForm();
  }
  return {
    fulfillmentMode: shipment.fulfillmentMode || FULFILLMENT_MODE.ONLINE.value,
    carrierId: shipment.carrierId || "",
    trackingNumber: shipment.trackingNumber || "",
    estimatedDeliveryDate: shipment.estimatedDeliveryDate
      ? formatEventAtForInput(shipment.estimatedDeliveryDate).slice(0, 10)
      : "",
  };
};

export const emptyTrackingEventForm = () => ({
  status: "",
  message: "",
  location: "",
  note: "",
  eventAt: formatEventAtForInput(new Date()),
});

export const trackingEventToForm = (event = null) => {
  if (!event) {
    return emptyTrackingEventForm();
  }
  return {
    status: event.status || "",
    message: event.message || "",
    location: event.location || "",
    note: event.note || "",
    eventAt: formatEventAtForInput(event.eventAt),
  };
};

export const canManageOrderShipment = (order = {}) =>
  Boolean(order?.orderNo) && order.status !== STATUS.CANCELLED.value;
