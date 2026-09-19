/**
 * Checkout address strategy (Block A — Rajwada MVP)
 *
 * Saved address book (UserAddress):
 *   - Logged-in users only (Phase 3: GET/POST /api/users/addresses).
 *   - Persists label, isDefault, and full shipping fields for reuse at checkout.
 *
 * Guest checkout:
 *   - No UserAddress rows. Guests pass shipping fields inline at checkout / place-order.
 *   - Address exists only on Order.addressSnapshot after the order is created (Phase 14).
 *
 * Order.addressSnapshot (immutable copy at place-order):
 *   - Fixed shape below — never includes label or isDefault.
 *   - Logged-in users may set optional userAddressId when the snapshot was copied from saved book.
 *   - Phase 5 enforces this shape on the Order model; Phase 4 provides validation/normalization.
 *
 * @typedef {Object} CheckoutAddressSnapshot
 * @property {string} fullName
 * @property {string} phone - 10-digit IN mobile
 * @property {string} addressLine1
 * @property {string} [addressLine2]
 * @property {string} city
 * @property {string} state
 * @property {string} pincode - 6-digit IN pincode
 * @property {string} country - 2-letter ISO, default IN
 * @property {string} [userAddressId] - present when copied from UserAddress (logged-in only)
 */

const PHONE_REGEX = /^\d{10}$/;
const PINCODE_REGEX = /^\d{6}$/;
const COUNTRY_REGEX = /^[A-Z]{2}$/;
const DEFAULT_COUNTRY = "IN";

/** Fields stored on Order.addressSnapshot (Phase 5 strict schema) */
const CHECKOUT_ADDRESS_SNAPSHOT_FIELDS = Object.freeze([
  "fullName",
  "phone",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "pincode",
  "country",
  "userAddressId",
]);

/** Required for inline / snapshot validation */
const CHECKOUT_ADDRESS_REQUIRED_FIELDS = Object.freeze([
  "fullName",
  "phone",
  "addressLine1",
  "city",
  "state",
  "pincode",
]);

/** Inline body fields accepted by validate-address (excludes userAddressId shortcut) */
const CHECKOUT_ADDRESS_INLINE_FIELDS = Object.freeze([
  ...CHECKOUT_ADDRESS_REQUIRED_FIELDS,
  "addressLine2",
  "country",
]);

const CHECKOUT_ADDRESS_STRATEGY = Object.freeze({
  savedBook: "logged_in_only",
  guestPersistence: "order_snapshot_only",
  snapshotFields: CHECKOUT_ADDRESS_SNAPSHOT_FIELDS,
  requiredSnapshotFields: CHECKOUT_ADDRESS_REQUIRED_FIELDS,
});

module.exports = {
  PHONE_REGEX,
  PINCODE_REGEX,
  COUNTRY_REGEX,
  DEFAULT_COUNTRY,
  CHECKOUT_ADDRESS_SNAPSHOT_FIELDS,
  CHECKOUT_ADDRESS_REQUIRED_FIELDS,
  CHECKOUT_ADDRESS_INLINE_FIELDS,
  CHECKOUT_ADDRESS_STRATEGY,
};
