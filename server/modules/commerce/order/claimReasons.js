/** Customer-facing reasons and admin resolution codes for order claims. */

const CUSTOMER_CLAIM_REASONS = [
  { value: "size_or_fit_issue", label: "Size or fit issue" },
  { value: "damaged_or_defective", label: "Damaged or defective" },
  { value: "wrong_item_received", label: "Wrong item received" },
  { value: "not_as_described", label: "Not as described" },
  { value: "quality_issue", label: "Quality issue" },
  { value: "other", label: "Other" },
];

const ADMIN_RESOLUTIONS = [
  { value: "approved_refund", label: "Approved refund" },
  { value: "approved_exchange", label: "Approved exchange" },
  { value: "approved_repair", label: "Approved repair" },
  { value: "rejected_out_of_window", label: "Rejected — out of window" },
  { value: "rejected_policy_not_eligible", label: "Rejected — not eligible" },
  { value: "rejected_missing_evidence", label: "Rejected — missing evidence" },
  { value: "rejected_invalid_request", label: "Rejected — invalid request" },
  { value: "manual_closed", label: "Manual closed" },
  { value: "other", label: "Other" },
];

const CUSTOMER_CLAIM_REASON_CODES = CUSTOMER_CLAIM_REASONS.map((row) => row.value);
const ADMIN_CLAIM_RESOLUTION_CODES = ADMIN_RESOLUTIONS.map((row) => row.value);

const CUSTOMER_CLAIM_REASON_SET = new Set(CUSTOMER_CLAIM_REASON_CODES);
const ADMIN_CLAIM_RESOLUTION_SET = new Set(ADMIN_CLAIM_RESOLUTION_CODES);

const CLAIM_NOTE_MAX_LENGTH = 500;

module.exports = {
  CUSTOMER_CLAIM_REASONS,
  ADMIN_RESOLUTIONS,
  CUSTOMER_CLAIM_REASON_CODES,
  CUSTOMER_CLAIM_REASON_SET,
  ADMIN_CLAIM_RESOLUTION_CODES,
  ADMIN_CLAIM_RESOLUTION_SET,
  CLAIM_NOTE_MAX_LENGTH,
};
