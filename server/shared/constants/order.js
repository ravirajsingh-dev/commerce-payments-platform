/** Order / Shipment / TrackingEvent — DB: `.value`, UI: `.label` */
const STATUS = {
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

const STATUS_LIST = Object.values(STATUS);
const STATUS_VALUES = STATUS_LIST.map((row) => row.value);
const STATUS_SET = new Set(STATUS_VALUES);

const pick = (...rows) => rows.map((row) => row.value);

const ORDER_PAYMENT_STATUS = {
  PENDING: "pending",
  INITIATED: "initiated",
  PAID: "paid",
  FAILED: "failed",
  ABANDONED: "abandoned",
  COD_PENDING: "cod_pending",
  COD_PAID: "cod_paid",
  REFUND_INITIATED: "refund_initiated",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
  CANCELLED: "cancelled",
};

const ORDER_PAYMENT_METHOD = {
  COD: "cod",
  RAZORPAY: "razorpay",
  STRIPE: "stripe",
  UPI: "upi",
  CARD: "card",
  NETBANKING: "netbanking",
  WALLET: "wallet",
};

const CANCEL_REQUEST_ELIGIBLE_ORDER_STATUSES = pick(
  STATUS.ORDER_PLACED,
  STATUS.PAYMENT_CONFIRMED,
  STATUS.ORDER_CONFIRMED,
  STATUS.PACKED,
);
const ADMIN_CANCEL_BLOCKED_ORDER_STATUSES = pick(
  STATUS.CANCELLED,
  STATUS.DELIVERED,
  STATUS.RETURN_COMPLETED,
);
const GMV_EXCLUDED_ORDER_STATUSES = pick(STATUS.CANCELLED);
const INVOICE_DOWNLOAD_ELIGIBLE_ORDER_STATUSES = pick(STATUS.DELIVERED);
const REVIEW_ELIGIBLE_ORDER_STATUSES = pick(STATUS.DELIVERED);

module.exports = {
  STATUS,
  STATUS_VALUES,
  STATUS_SET,
  ORDER_PAYMENT_STATUS,
  ORDER_PAYMENT_METHOD,
  CANCEL_REQUEST_ELIGIBLE_ORDER_STATUSES,
  ADMIN_CANCEL_BLOCKED_ORDER_STATUSES,
  GMV_EXCLUDED_ORDER_STATUSES,
  INVOICE_DOWNLOAD_ELIGIBLE_ORDER_STATUSES,
  REVIEW_ELIGIBLE_ORDER_STATUSES,
};
