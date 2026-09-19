/** Admin-only cancellation reasons (operational / support). */
const ADMIN_CANCELLATION_REASON_OPTIONS = [
  { value: "customer_requested", label: "Customer requested cancellation" },
  { value: "wrong_address", label: "Wrong or undeliverable address" },
  { value: "wrong_size_or_item", label: "Wrong size or item on order" },
  { value: "out_of_stock", label: "Out of stock / cannot fulfill" },
  { value: "payment_failed_or_fraud", label: "Payment failed or suspected fraud" },
  { value: "duplicate_order", label: "Duplicate order" },
  { value: "cannot_ship_to_location", label: "Cannot ship to location" },
  { value: "customer_unreachable", label: "Customer unreachable" },
  { value: "other", label: "Other (please describe)" },
];

export const ADMIN_CANCELLATION_REASON_SET = new Set(
  ADMIN_CANCELLATION_REASON_OPTIONS.map((row) => row.value),
);

export const CANCELLATION_NOTE_MAX_LENGTH = 300;

export const findAdminCancellationReasonOption = (value) =>
  ADMIN_CANCELLATION_REASON_OPTIONS.find((row) => row.value === value) || null;

export const loadAdminCancellationReasonOptions = () =>
  Promise.resolve(ADMIN_CANCELLATION_REASON_OPTIONS);

export const getAdminCancellationReasonLabel = (value) =>
  findAdminCancellationReasonOption(value)?.label ||
  String(value || "").replace(/_/g, " ");
