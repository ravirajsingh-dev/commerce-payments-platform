/** Labels shown to customers when an order was cancelled from admin. */
const ADMIN_CANCELLATION_REASON_LABELS = {
  customer_requested: "Cancelled at your request",
  wrong_address: "Shipping address could not be verified",
  wrong_size_or_item: "Wrong size or item on the order",
  out_of_stock: "Item could not be fulfilled (out of stock)",
  payment_failed_or_fraud: "Payment could not be completed",
  duplicate_order: "Duplicate order",
  cannot_ship_to_location: "Cannot ship to your location",
  customer_unreachable: "We could not reach you to confirm delivery",
  other: "Other reason",
};

export const ADMIN_CANCELLATION_REASON_SET = new Set(
  Object.keys(ADMIN_CANCELLATION_REASON_LABELS),
);

export const getAdminCancellationReasonLabel = (value) =>
  ADMIN_CANCELLATION_REASON_LABELS[value] ||
  String(value || "").replace(/_/g, " ");
