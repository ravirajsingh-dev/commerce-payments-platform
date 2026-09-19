import { label } from "@src/constants/order";

export const buildCarrierTrackingLink = (trackingUrl, trackingNumber) => {
  const url = String(trackingUrl || "").trim();
  const awb = String(trackingNumber || "").trim();
  if (!url || !awb) {
    return null;
  }
  return url.replace(/\{trackingNumber\}/gi, awb).replace(/\{awb\}/gi, awb);
};

export const openCarrierTracking = (trackingUrl, trackingNumber) => {
  const href = buildCarrierTrackingLink(trackingUrl, trackingNumber);
  if (!href) {
    return false;
  }
  window.open(href, "_blank", "noopener,noreferrer");
  return true;
};

export const formatTrackingStatus = (status) => label(status);

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

export const hasShipmentSummary = (summary) =>
  Boolean(
    summary?.trackingNumber ||
      summary?.carrierName ||
      summary?.latestStepMessage ||
      summary?.currentStatus,
  );

export const sortTrackingEventsChronological = (events = []) =>
  [...events].sort((a, b) => new Date(a.eventAt) - new Date(b.eventAt));
