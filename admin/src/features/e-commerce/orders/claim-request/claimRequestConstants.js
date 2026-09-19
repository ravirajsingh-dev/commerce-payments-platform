export const CLAIM_TYPES = [
  { value: "return", label: "Return" },
  { value: "exchange", label: "Exchange" },
  { value: "repair", label: "Repair" },
  { value: "other", label: "Other concern" },
];

export const CUSTOMER_CLAIM_REASONS = [
  { value: "size_or_fit_issue", label: "Size or fit issue" },
  { value: "damaged_or_defective", label: "Damaged or defective" },
  { value: "wrong_item_received", label: "Wrong item received" },
  { value: "not_as_described", label: "Not as described" },
  { value: "quality_issue", label: "Quality issue" },
  { value: "other", label: "Other" },
];

export const CLAIM_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "in_transit", label: "In transit" },
  { value: "received", label: "Received" },
  { value: "inspecting", label: "Inspecting" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];

export const ADMIN_RESOLUTIONS = [
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
