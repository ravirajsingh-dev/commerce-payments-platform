const { STATUS } = require("../../../shared/constants/order");
const {
  OPEN_CLAIM_STATUS_SET,
} = require("../../../shared/constants/orderClaim");

const normalizeObjectId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.toString) return value.toString();
  return String(value);
};

const isOrderDelivered = (order) => order?.status === STATUS.DELIVERED.value;

const isOrderCancelled = (order) => order?.status === STATUS.CANCELLED.value;

const getDeliveredAt = ({ shipment, trackingEvents = [] } = {}) => {
  const deliveredEvents = (Array.isArray(trackingEvents) ? trackingEvents : [])
    .filter((row) => row?.status === STATUS.DELIVERED.value && row?.eventAt)
    .map((row) => new Date(row.eventAt))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  if (deliveredEvents.length > 0) {
    return deliveredEvents[0];
  }

  if (
    shipment?.currentStatus === STATUS.DELIVERED.value &&
    shipment?.latestStepAt
  ) {
    const date = new Date(shipment.latestStepAt);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
};

const isWithinClaimWindow = ({
  deliveredAt,
  claimWindowDays,
  now = new Date(),
} = {}) => {
  if (!deliveredAt) return false;
  if (claimWindowDays == null) return true;
  const parsedDays = Number(claimWindowDays);
  if (!Number.isFinite(parsedDays) || parsedDays < 0) return false;
  const deliveredMs = new Date(deliveredAt).getTime();
  const nowMs = new Date(now).getTime();
  if (Number.isNaN(deliveredMs) || Number.isNaN(nowMs)) return false;
  const deadlineMs = deliveredMs + parsedDays * 24 * 60 * 60 * 1000;
  return nowMs <= deadlineMs;
};

const resolveEffectiveClaimPolicy = ({ product, claimPolicy } = {}) => {
  if (!product?.claimPolicyId || !claimPolicy) return null;
  if (
    normalizeObjectId(product.claimPolicyId) !==
    normalizeObjectId(claimPolicy._id)
  )
    return null;
  if (!claimPolicy.isActive) return null;
  if (claimPolicy.eligibility?.claimsEnabled === false) return null;
  return claimPolicy;
};

const buildClaimScopeKey = (orderItemIds = []) => {
  if (!Array.isArray(orderItemIds) || orderItemIds.length === 0) {
    return "whole_order";
  }
  const normalized = [
    ...new Set(orderItemIds.map(normalizeObjectId).filter(Boolean)),
  ].sort();
  return normalized.length > 0 ? normalized.join("|") : "whole_order";
};

const hasOpenClaimForScope = ({ claims = [], scopeKey }) => {
  if (!scopeKey) return false;
  return (Array.isArray(claims) ? claims : []).some(
    (row) =>
      row?.scopeKey === scopeKey && OPEN_CLAIM_STATUS_SET.has(row?.status),
  );
};

const canRequestClaimForOrder = ({
  order,
  shipment,
  trackingEvents,
  claimWindowDays,
  now,
} = {}) => {
  if (!order) {
    return { ok: false, reason: "ORDER_NOT_FOUND" };
  }
  if (isOrderCancelled(order)) {
    return { ok: false, reason: "ORDER_CANCELLED" };
  }
  if (!isOrderDelivered(order)) {
    return { ok: false, reason: "ORDER_NOT_DELIVERED" };
  }

  const deliveredAt = getDeliveredAt({ shipment, trackingEvents });
  if (!deliveredAt) {
    return { ok: false, reason: "DELIVERED_MILESTONE_MISSING" };
  }
  if (!isWithinClaimWindow({ deliveredAt, claimWindowDays, now })) {
    return { ok: false, reason: "OUTSIDE_CLAIM_WINDOW", deliveredAt };
  }
  return { ok: true, deliveredAt };
};

const TERMINAL_CLAIM_STATUSES = new Set(["completed", "closed"]);

const resolveEffectiveClaimWindowDays = (items = []) => {
  const claimWindowDays = (Array.isArray(items) ? items : []).reduce((maxDays, item) => {
    const days = item?.claimPolicySnapshot?.eligibility?.claimWindowDays;
    if (days === null || days === undefined) return maxDays;
    const parsed = Number(days);
    return Number.isFinite(parsed) ? Math.min(maxDays, parsed) : maxDays;
  }, Infinity);
  return claimWindowDays === Infinity ? null : claimWindowDays;
};

const buildUserClaimEligibility = ({
  order,
  items = [],
  shipment,
  trackingEvents,
  claim,
  now = new Date(),
} = {}) => {
  const policies = (Array.isArray(items) ? items : [])
    .map((row) => row?.claimPolicySnapshot)
    .filter(Boolean);

  const policyEligible =
    policies.length > 0 &&
    policies.every((policy) => policy?.eligibility?.claimsEnabled !== false);

  const effectiveWindowDays = resolveEffectiveClaimWindowDays(items);

  const base = {
    policyEligible,
    claimWindowDays: effectiveWindowDays,
    deliveredAt: null,
    claimWindowDeadline: null,
    canRequestClaim: false,
    canResubmit: false,
    reason: null,
  };

  if (!order) {
    return { ...base, reason: "ORDER_NOT_FOUND" };
  }
  if (isOrderCancelled(order)) {
    return { ...base, reason: "ORDER_CANCELLED" };
  }
  if (!isOrderDelivered(order)) {
    return { ...base, reason: "ORDER_NOT_DELIVERED" };
  }
  if (!policyEligible) {
    return { ...base, reason: "POLICY_NOT_ELIGIBLE" };
  }

  const deliveredAt = getDeliveredAt({ shipment, trackingEvents });
  base.deliveredAt = deliveredAt ? deliveredAt.toISOString() : null;

  if (!deliveredAt) {
    return { ...base, reason: "DELIVERED_MILESTONE_MISSING" };
  }

  if (effectiveWindowDays != null) {
    const deadlineMs = deliveredAt.getTime() + effectiveWindowDays * 24 * 60 * 60 * 1000;
    base.claimWindowDeadline = new Date(deadlineMs).toISOString();
    if (!isWithinClaimWindow({ deliveredAt, claimWindowDays: effectiveWindowDays, now })) {
      return { ...base, reason: "OUTSIDE_CLAIM_WINDOW" };
    }
  }

  const claimStatus = claim?.status;
  if (claimStatus && OPEN_CLAIM_STATUS_SET.has(claimStatus)) {
    return { ...base, reason: "OPEN_CLAIM_EXISTS" };
  }

  if (claimStatus === "rejected") {
    return {
      ...base,
      canRequestClaim: true,
      canResubmit: true,
    };
  }

  if (claimStatus && TERMINAL_CLAIM_STATUSES.has(claimStatus)) {
    return { ...base, reason: "CLAIM_ALREADY_RESOLVED" };
  }

  return { ...base, canRequestClaim: true };
};

module.exports = {
  isOrderDelivered,
  isOrderCancelled,
  getDeliveredAt,
  isWithinClaimWindow,
  resolveEffectiveClaimPolicy,
  buildClaimScopeKey,
  hasOpenClaimForScope,
  canRequestClaimForOrder,
  resolveEffectiveClaimWindowDays,
  buildUserClaimEligibility,
};
