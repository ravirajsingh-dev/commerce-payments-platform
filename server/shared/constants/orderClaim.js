const CLAIM_TYPE = {
  RETURN: { value: "return", label: "Return" },
  EXCHANGE: { value: "exchange", label: "Exchange" },
  REPAIR: { value: "repair", label: "Repair" },
  OTHER: { value: "other", label: "Other" },
};

const CLAIM_STATUS = {
  DRAFT: { value: "draft", label: "Draft" },
  PENDING: { value: "pending", label: "Pending review" },
  APPROVED: { value: "approved", label: "Approved" },
  REJECTED: { value: "rejected", label: "Rejected" },
  IN_TRANSIT: { value: "in_transit", label: "In transit" },
  RECEIVED: { value: "received", label: "Received" },
  INSPECTING: { value: "inspecting", label: "Inspecting" },
  COMPLETED: { value: "completed", label: "Completed" },
  CLOSED: { value: "closed", label: "Closed" },
};

const CLAIM_TYPE_LIST = Object.values(CLAIM_TYPE);
const CLAIM_STATUS_LIST = Object.values(CLAIM_STATUS);

const CLAIM_TYPE_VALUES = CLAIM_TYPE_LIST.map((row) => row.value);
const CLAIM_STATUS_VALUES = CLAIM_STATUS_LIST.map((row) => row.value);

const CLAIM_TYPE_LABELS = Object.fromEntries(
  CLAIM_TYPE_LIST.map((row) => [row.value, row.label]),
);
const CLAIM_STATUS_LABELS = Object.fromEntries(
  CLAIM_STATUS_LIST.map((row) => [row.value, row.label]),
);

const CLAIM_TYPE_SET = new Set(CLAIM_TYPE_VALUES);
const CLAIM_STATUS_SET = new Set(CLAIM_STATUS_VALUES);

const OPEN_CLAIM_STATUSES = [
  CLAIM_STATUS.DRAFT.value,
  CLAIM_STATUS.PENDING.value,
  CLAIM_STATUS.APPROVED.value,
  CLAIM_STATUS.IN_TRANSIT.value,
  CLAIM_STATUS.RECEIVED.value,
  CLAIM_STATUS.INSPECTING.value,
];
const OPEN_CLAIM_STATUS_SET = new Set(OPEN_CLAIM_STATUSES);

const labelClaimType = (value) => CLAIM_TYPE_LABELS[value] ?? value;

module.exports = {
  CLAIM_TYPE_LIST,
  CLAIM_TYPE_VALUES,
  CLAIM_TYPE_SET,
  CLAIM_STATUS,
  CLAIM_STATUS_LIST,
  CLAIM_STATUS_VALUES,
  CLAIM_STATUS_SET,
  OPEN_CLAIM_STATUS_SET,
  labelClaimType,
};
