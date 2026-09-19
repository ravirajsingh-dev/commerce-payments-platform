import {
  ADMIN_CANCELLATION_REASON_SET,
  getAdminCancellationReasonLabel,
} from "@src/constants/adminCancellationReasons";
import { STATUS } from "@src/constants/order";

const CANCELLATION_REASON_OPTIONS = [
  { value: "ordered_by_mistake", label: "Ordered by mistake" },
  { value: "wrong_size_or_item", label: "Wrong size or item" },
  { value: "delivery_too_slow", label: "Delivery is taking too long" },
  { value: "found_better_price", label: "Found a better price elsewhere" },
  { value: "payment_issue", label: "Payment or checkout issue" },
  { value: "changed_mind", label: "Changed my mind" },
  { value: "other", label: "Other (please describe)" },
];

export const CANCELLATION_NOTE_MAX_LENGTH = 300;

/** Must match server CANCEL_REQUEST_ELIGIBLE_ORDER_STATUSES. */
const CANCEL_REQUEST_ELIGIBLE_STATUSES = new Set([
  STATUS.ORDER_PLACED.value,
  STATUS.PAYMENT_CONFIRMED.value,
  STATUS.ORDER_CONFIRMED.value,
  STATUS.PACKED.value,
]);

export const getCancellationReasonLabel = (value) =>
  CANCELLATION_REASON_OPTIONS.find((row) => row.value === value)?.label ||
  String(value || "").replace(/_/g, " ");

export const findCancellationReasonOption = (value) =>
  CANCELLATION_REASON_OPTIONS.find((row) => row.value === value) || null;

export const loadCancellationReasonOptions = () =>
  Promise.resolve(CANCELLATION_REASON_OPTIONS);

export const canRequestOrderCancellation = (order = {}) => {
  if (!order?.orderNo) return false;
  if (order.cancellation?.requestedAt) return false;
  if (order.status === STATUS.CANCELLED.value) return false;
  return CANCEL_REQUEST_ELIGIBLE_STATUSES.has(order.status);
};

export const hasPendingCancellationRequest = (order = {}) =>
  Boolean(order?.cancellation?.requestedAt) &&
  order?.status !== STATUS.CANCELLED.value;

export const formatOrderCancellationReason = (value) => {
  if (!value) return "";
  if (ADMIN_CANCELLATION_REASON_SET.has(value)) {
    return getAdminCancellationReasonLabel(value);
  }
  return getCancellationReasonLabel(value);
};

export const isOrderCancelledByAdmin = (order = {}) => {
  if (order?.status !== STATUS.CANCELLED.value) return false;
  const reason = String(order.cancellation?.reason || "").trim();
  if (!reason) return false;
  return ADMIN_CANCELLATION_REASON_SET.has(reason);
};

export const hasOrderCancellationDetails = (order = {}) =>
  order?.status === STATUS.CANCELLED.value &&
  Boolean(
    String(order.cancellation?.reason || "").trim() ||
      String(order.cancellation?.note || "").trim(),
  );
