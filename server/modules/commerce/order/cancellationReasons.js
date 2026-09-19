/** Customer-facing reasons (cancellation request on storefront). */
const CUSTOMER_CANCELLATION_REASON_CODES = [
  "ordered_by_mistake",
  "wrong_size_or_item",
  "delivery_too_slow",
  "found_better_price",
  "payment_issue",
  "changed_mind",
  "other",
];

/** Admin-only reasons (manual cancel from admin panel). */
const ADMIN_CANCELLATION_REASON_CODES = [
  "customer_requested",
  "wrong_address",
  "wrong_size_or_item",
  "out_of_stock",
  "payment_failed_or_fraud",
  "duplicate_order",
  "cannot_ship_to_location",
  "customer_unreachable",
  "other",
];

const CUSTOMER_CANCELLATION_REASON_SET = new Set(CUSTOMER_CANCELLATION_REASON_CODES);
const ADMIN_CANCELLATION_REASON_SET = new Set(ADMIN_CANCELLATION_REASON_CODES);

const CANCELLATION_NOTE_MAX_LENGTH = 300;

module.exports = {
  CUSTOMER_CANCELLATION_REASON_CODES,
  CUSTOMER_CANCELLATION_REASON_SET,
  ADMIN_CANCELLATION_REASON_CODES,
  ADMIN_CANCELLATION_REASON_SET,
  CANCELLATION_NOTE_MAX_LENGTH,
};
