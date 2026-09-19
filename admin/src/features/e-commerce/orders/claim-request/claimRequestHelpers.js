import {
  CLAIM_TYPES,
  CUSTOMER_CLAIM_REASONS,
  CLAIM_STATUSES,
  ADMIN_RESOLUTIONS,
} from "./claimRequestConstants";

export const CLAIM_TYPE_OPTIONS = CLAIM_TYPES;
export const CUSTOMER_CLAIM_REASON_OPTIONS = CUSTOMER_CLAIM_REASONS;
const CLAIM_STATUS_OPTIONS = CLAIM_STATUSES;
export const ADMIN_RESOLUTION_OPTIONS = ADMIN_RESOLUTIONS;

export const CLAIM_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  ...CLAIM_STATUS_OPTIONS,
];

export const CLAIM_MUTABLE_STATUS_OPTIONS = CLAIM_STATUS_OPTIONS.filter(
  (row) => !["rejected", "draft"].includes(row.value),
);

export const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "No change" },
  { value: "refund_initiated", label: "Refund initiated" },
  { value: "refunded", label: "Refunded" },
  { value: "partially_refunded", label: "Partially refunded" },
];

export const CLAIM_NOTE_MAX_LENGTH = 500;

export const labelClaimType = (value) =>
  CLAIM_TYPE_OPTIONS.find((row) => row.value === value)?.label || value || "—";

export const labelClaimStatus = (value) =>
  CLAIM_STATUS_OPTIONS.find((row) => row.value === value)?.label ||
  String(value || "").replaceAll("_", " ") ||
  "—";

export const labelClaimReason = (value) =>
  CUSTOMER_CLAIM_REASON_OPTIONS.find((row) => row.value === value)?.label || value || "—";

export const claimStatusBadgeClass = (status) =>
  `badge entity-status claim-request-status claim-request-status--${String(status || "unknown").replaceAll("_", "-")}`;

export const isTerminalClaimStatus = (status) =>
  ["completed", "closed", "rejected"].includes(String(status || "").toLowerCase());

export const canApproveOrReject = (status) => String(status || "").toLowerCase() === "pending";

export const canCompleteClaim = (status) => !isTerminalClaimStatus(status);

export const getSelectOptionByValue = (options, value) =>
  options.find((item) => item.value === value) ?? null;

export const resolveOrderItemLabel = (orderItemId, orderItems = []) => {
  const item = (Array.isArray(orderItems) ? orderItems : []).find(
    (row) => row.orderItemId === orderItemId,
  );
  if (!item) return orderItemId || "Item";
  const size = item.size ? ` · ${item.size}` : "";
  return `${item.productNameSnapshot || "Item"}${size}`;
};

export const CLAIM_SUMMARY_STATUSES = [
  "pending",
  "approved",
  "in_transit",
  "received",
  "inspecting",
  "completed",
  "rejected",
  "closed",
  "draft",
];
