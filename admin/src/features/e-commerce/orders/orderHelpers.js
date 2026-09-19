import { getAdminCancellationReasonLabel } from "@src/constants/adminCancellationReasons";
import {
  ORDER_PAYMENT_STATUS_OPTIONS,
  STATUS,
  STATUS_LIST,
  label,
} from "@src/constants/order";

export { STATUS, STATUS_LIST, label, ORDER_PAYMENT_STATUS_OPTIONS };

export const PAYMENT_STATUS_OPTIONS = ORDER_PAYMENT_STATUS_OPTIONS;

export const canAdminCancelOrder = (order = {}) =>
  Boolean(order?.orderNo) &&
  ![STATUS.CANCELLED.value, STATUS.DELIVERED.value].includes(order.status);

export const hasPendingCancellationRequest = (order = {}) =>
  Boolean(order?.cancellation?.requestedAt) &&
  order?.status !== STATUS.CANCELLED.value;

const CUSTOMER_CANCELLATION_REASON_LABELS = {
  ordered_by_mistake: "Ordered by mistake",
  wrong_size_or_item: "Wrong size or item",
  delivery_too_slow: "Delivery is taking too long",
  found_better_price: "Found a better price elsewhere",
  payment_issue: "Payment or checkout issue",
  changed_mind: "Changed mind",
  other: "Other",
};

export const formatCancellationReason = (code) => {
  if (!code) return "";
  const adminLabel = getAdminCancellationReasonLabel(code);
  if (adminLabel && adminLabel !== code) return adminLabel;
  return CUSTOMER_CANCELLATION_REASON_LABELS[code] || code.replace(/_/g, " ");
};

export const formatInr = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  try {
    return numeric.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  } catch {
    return `₹${numeric.toFixed(2)}`;
  }
};

export const formatOrderDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN");
};

export const formatOrderAddress = (snapshot = {}) => {
  const line2 = snapshot.addressLine2 ? `, ${snapshot.addressLine2}` : "";
  return `${snapshot.fullName || ""}\n${snapshot.phone || ""}\n${snapshot.addressLine1 || ""}${line2}\n${snapshot.city || ""}, ${snapshot.state || ""} ${snapshot.pincode || ""}\n${snapshot.country || ""}`;
};

export const canAdminEditOrderAddress = (order = {}) =>
  Boolean(order?.orderNo) && order.status !== STATUS.CANCELLED.value;

export const addressSnapshotToForm = (snapshot = {}) => ({
  fullName: snapshot.fullName || "",
  phone: snapshot.phone || "",
  addressLine1: snapshot.addressLine1 || "",
  addressLine2: snapshot.addressLine2 || "",
  city: snapshot.city || "",
  state: snapshot.state || "",
  pincode: snapshot.pincode || "",
  country: snapshot.country || "IN",
});
