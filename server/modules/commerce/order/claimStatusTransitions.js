const { CLAIM_STATUS } = require("../../../shared/constants/orderClaim");

const PATCH_ALLOWED_TRANSITIONS = {
  [CLAIM_STATUS.APPROVED.value]: new Set([
    CLAIM_STATUS.IN_TRANSIT.value,
    CLAIM_STATUS.RECEIVED.value,
    CLAIM_STATUS.INSPECTING.value,
    CLAIM_STATUS.CLOSED.value,
  ]),
  [CLAIM_STATUS.IN_TRANSIT.value]: new Set([
    CLAIM_STATUS.RECEIVED.value,
    CLAIM_STATUS.INSPECTING.value,
    CLAIM_STATUS.CLOSED.value,
  ]),
  [CLAIM_STATUS.RECEIVED.value]: new Set([
    CLAIM_STATUS.INSPECTING.value,
    CLAIM_STATUS.CLOSED.value,
  ]),
  [CLAIM_STATUS.INSPECTING.value]: new Set([CLAIM_STATUS.CLOSED.value]),
};

const DEDICATED_ENDPOINT_STATUSES = new Set([
  CLAIM_STATUS.PENDING.value,
  CLAIM_STATUS.REJECTED.value,
  CLAIM_STATUS.COMPLETED.value,
  CLAIM_STATUS.DRAFT.value,
]);

const assertClaimStatusTransition = (fromStatus, toStatus) => {
  const from = String(fromStatus || "").trim().toLowerCase();
  const to = String(toStatus || "").trim().toLowerCase();

  if (!from || !to || from === to) {
    return { ok: true };
  }

  if (DEDICATED_ENDPOINT_STATUSES.has(to)) {
    return {
      ok: false,
      message: `Status "${to}" must be set through the dedicated claim workflow action.`,
    };
  }

  const allowed = PATCH_ALLOWED_TRANSITIONS[from];
  if (!allowed || !allowed.has(to)) {
    return {
      ok: false,
      message: `Invalid claim status transition from "${from}" to "${to}".`,
    };
  }

  return { ok: true };
};

module.exports = {
  PATCH_ALLOWED_TRANSITIONS,
  assertClaimStatusTransition,
};
