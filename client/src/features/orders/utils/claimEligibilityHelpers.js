const OPEN_CLAIM_STATUSES = new Set([
  "draft",
  "pending",
  "approved",
  "in_transit",
  "received",
  "inspecting",
]);

const TERMINAL_CLAIM_STATUSES = new Set(["completed", "closed"]);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getDeliveredAt = (order) => {
  const trackingEvents = Array.isArray(order?.trackingEvents) ? order.trackingEvents : [];
  const deliveredEvents = trackingEvents
    .filter((row) => row?.status === "delivered" && row?.eventAt)
    .map((row) => new Date(row.eventAt))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  if (deliveredEvents.length > 0) {
    return deliveredEvents[0];
  }

  const shipment = order?.shipment;
  if (shipment?.currentStatus === "delivered" && shipment?.latestStepAt) {
    const date = new Date(shipment.latestStepAt);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
};

const resolveEffectiveClaimWindowDays = (items = []) => {
  const claimWindowDays = (Array.isArray(items) ? items : []).reduce((minDays, item) => {
    const days = item?.claimPolicySnapshot?.eligibility?.claimWindowDays;
    if (days === null || days === undefined) return minDays;
    const parsed = Number(days);
    return Number.isFinite(parsed) ? Math.min(minDays, parsed) : minDays;
  }, Infinity);

  return claimWindowDays === Infinity ? null : claimWindowDays;
};

const isWithinClaimWindow = ({ deliveredAt, claimWindowDays, now = new Date() }) => {
  if (!deliveredAt) return false;
  if (claimWindowDays == null) return true;
  const parsedDays = Number(claimWindowDays);
  if (!Number.isFinite(parsedDays) || parsedDays < 0) return false;
  const deadlineMs = deliveredAt.getTime() + parsedDays * MS_PER_DAY;
  return new Date(now).getTime() <= deadlineMs;
};

const buildClaimWindowDeadline = (deliveredAt, claimWindowDays) => {
  if (!deliveredAt || claimWindowDays == null) return null;
  const parsedDays = Number(claimWindowDays);
  if (!Number.isFinite(parsedDays)) return null;
  return new Date(deliveredAt.getTime() + parsedDays * MS_PER_DAY).toISOString();
};

const buildFallbackClaimEligibility = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  const policies = items.map((row) => row?.claimPolicySnapshot).filter(Boolean);
  const policyEligible =
    policies.length > 0 &&
    policies.every((policy) => policy?.eligibility?.claimsEnabled !== false);
  const effectiveWindowDays = resolveEffectiveClaimWindowDays(items);
  const claim = order?.claim || null;
  const claimStatus = claim?.status;

  const base = {
    policyEligible,
    claimWindowDays: effectiveWindowDays,
    deliveredAt: null,
    claimWindowDeadline: null,
    canRequestClaim: false,
    canResubmit: false,
    reason: null,
  };

  if (order?.status === "cancelled") {
    return { ...base, reason: "ORDER_CANCELLED" };
  }
  if (order?.status !== "delivered") {
    return { ...base, reason: "ORDER_NOT_DELIVERED" };
  }
  if (!policyEligible) {
    return { ...base, reason: "POLICY_NOT_ELIGIBLE" };
  }

  const deliveredAt = getDeliveredAt(order);
  base.deliveredAt = deliveredAt ? deliveredAt.toISOString() : null;
  base.claimWindowDeadline = buildClaimWindowDeadline(deliveredAt, effectiveWindowDays);

  if (!deliveredAt) {
    return { ...base, reason: "DELIVERED_MILESTONE_MISSING" };
  }

  if (!isWithinClaimWindow({ deliveredAt, claimWindowDays: effectiveWindowDays })) {
    return { ...base, reason: "OUTSIDE_CLAIM_WINDOW" };
  }

  if (claimStatus && OPEN_CLAIM_STATUSES.has(claimStatus)) {
    return { ...base, reason: "OPEN_CLAIM_EXISTS" };
  }

  if (claimStatus === "rejected") {
    return { ...base, canRequestClaim: true, canResubmit: true };
  }

  if (claimStatus && TERMINAL_CLAIM_STATUSES.has(claimStatus)) {
    return { ...base, reason: "CLAIM_ALREADY_RESOLVED" };
  }

  return { ...base, canRequestClaim: true };
};

export const resolveClaimEligibility = (order) => {
  const fallback = buildFallbackClaimEligibility(order);
  if (!order?.claimEligibility) {
    return fallback;
  }

  const server = order.claimEligibility;
  const claimWindowDeadline =
    server.claimWindowDeadline ||
    buildClaimWindowDeadline(
      server.deliveredAt ? new Date(server.deliveredAt) : getDeliveredAt(order),
      server.claimWindowDays ?? fallback.claimWindowDays,
    );

  return {
    ...fallback,
    ...server,
    claimWindowDeadline,
  };
};

export const shouldShowClaimSection = (order) => {
  if (!order || order.status === "cancelled") return false;
  if (order.claim?.status) return true;

  const eligibility = resolveClaimEligibility(order);
  const countdown = formatClaimWindowCountdown(eligibility.claimWindowDeadline);
  return (
    (eligibility.canRequestClaim || eligibility.canResubmit) &&
    !countdown?.expired &&
    eligibility.policyEligible !== false
  );
};

export const formatClaimWindowCountdown = (deadlineIso, now = new Date()) => {
  if (!deadlineIso) return null;
  const deadlineMs = new Date(deadlineIso).getTime();
  const nowMs = new Date(now).getTime();
  if (Number.isNaN(deadlineMs) || Number.isNaN(nowMs)) return null;

  const remainingMs = deadlineMs - nowMs;
  if (remainingMs <= 0) {
    return { expired: true, label: "Claim window expired" };
  }

  const daysLeft = Math.ceil(remainingMs / MS_PER_DAY);
  if (daysLeft === 1) {
    return { expired: false, label: "1 day left to submit a claim" };
  }
  return { expired: false, label: `${daysLeft} days left to submit a claim` };
};
