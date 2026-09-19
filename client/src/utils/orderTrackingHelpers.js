const OPEN_CLAIM_STATUSES = new Set([
  "pending",
  "approved",
  "in_transit",
  "received",
  "inspecting",
]);

export const hasOpenOrderClaim = (claim) =>
  Boolean(claim?.status) && OPEN_CLAIM_STATUSES.has(String(claim.status).trim().toLowerCase());
