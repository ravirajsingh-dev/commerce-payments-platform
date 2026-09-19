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

export const STATUS_LIST = Object.values(STATUS);

const STATUS_LABELS = Object.fromEntries(
  STATUS_LIST.map((row) => [row.value, row.label]),
);

export const label = (value) => STATUS_LABELS[value] ?? value;

export const ORDER_PAYMENT_STATUS_OPTIONS = Object.entries({
  pending: "Pending",
  initiated: "Initiated",
  paid: "Paid",
  failed: "Failed",
  abandoned: "Abandoned",
  cod_pending: "COD pending",
  cod_paid: "COD paid",
  refund_initiated: "Refund initiated",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  cancelled: "Cancelled",
}).map(([value, labelText]) => ({ value, label: labelText }));
