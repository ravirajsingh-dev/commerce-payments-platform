export const STATUS = {
  ORDER_PLACED: { value: "order_placed", label: "Order placed" },
  PAYMENT_CONFIRMED: { value: "payment_confirmed", label: "Payment confirmed" },
  ORDER_CONFIRMED: { value: "order_confirmed", label: "Order confirmed" },
  PACKED: { value: "packed", label: "Packed" },
  SHIPPED: { value: "shipped", label: "Shipped" },
  HUB_RECEIVED: { value: "hub_received", label: "Hub received" },
  IN_TRANSIT: { value: "in_transit", label: "In transit" },
  OUT_FOR_DELIVERY: { value: "out_for_delivery", label: "Out for delivery" },
  DELIVERED: { value: "delivered", label: "Delivered" },
  DELIVERY_ATTEMPTED: { value: "delivery_attempted", label: "Delivery attempted" },
  RETURN_INITIATED: { value: "return_initiated", label: "Return initiated" },
  RETURN_PICKED: { value: "return_picked", label: "Return picked" },
  RETURN_COMPLETED: { value: "return_completed", label: "Return completed" },
  CANCELLED: { value: "cancelled", label: "Cancelled" },
};

const STATUS_LABELS = Object.fromEntries(
  Object.values(STATUS).map((row) => [row.value, row.label]),
);

export const label = (value) => STATUS_LABELS[value] ?? value;

export const ORDER_PAYMENT_STATUS_LABELS = {
  pending: "Payment pending",
  initiated: "Payment initiated",
  paid: "Paid",
  failed: "Payment failed",
  abandoned: "Abandoned",
  cod_pending: "COD pending",
  cod_paid: "COD collected",
  refund_initiated: "Refund initiated",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  cancelled: "Cancelled",
};
