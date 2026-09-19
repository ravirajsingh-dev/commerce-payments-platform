const mongoose = require("mongoose");
const Order = require("../../../models/Order");
const OrderItem = require("../../../models/OrderItem");
const OrderClaim = require("../../../models/OrderClaim");
const Shipment = require("../../../models/Shipment");
const TrackingEvent = require("../../../models/TrackingEvent");
const { isValidOrderNoFormat } = require("./orderNumberGenerator");
const { CLAIM_TYPE_SET, CLAIM_STATUS, labelClaimType } = require("../../../shared/constants/orderClaim");
const { CUSTOMER_CLAIM_REASON_SET, CLAIM_NOTE_MAX_LENGTH } = require("./claimReasons");
const { scheduleClaimLifecycleEmail } = require("./orderEmails");
const {
  canRequestClaimForOrder,
  buildClaimScopeKey,
  hasOpenClaimForScope,
} = require("./orderClaimEligibility");

const ORDER_CLAIM_ERROR = {
  INVALID_ORDER_NO: "INVALID_ORDER_NO",
  NOT_FOUND: "ORDER_NOT_FOUND",
  CLAIM_NOT_FOUND: "CLAIM_NOT_FOUND",
  ORDER_NOT_DELIVERED: "ORDER_NOT_DELIVERED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  OUTSIDE_CLAIM_WINDOW: "OUTSIDE_CLAIM_WINDOW",
  DUPLICATE_SCOPE_OPEN_CLAIM: "DUPLICATE_SCOPE_OPEN_CLAIM",
  INVALID_CLAIM_TYPE: "INVALID_CLAIM_TYPE",
  INVALID_REASON: "INVALID_CLAIM_REASON",
  NOTE_TOO_LONG: "CLAIM_NOTE_TOO_LONG",
  POLICY_NOT_ELIGIBLE: "CLAIM_POLICY_NOT_ELIGIBLE",
  INVALID_AFFECTED_LINES: "INVALID_AFFECTED_LINES",
  EVIDENCE_REQUIRED: "EVIDENCE_REQUIRED",
  INVALID_CLAIM_STATUS: "INVALID_CLAIM_STATUS",
  INVALID_LOGISTICS: "INVALID_CLAIM_LOGISTICS",
};

const RETURN_SHIPMENT_CLAIM_TYPES = new Set(["return", "exchange"]);

const toObjectId = (id) => new mongoose.Types.ObjectId(id);
const normalizeOrderNo = (orderNo) => String(orderNo || "").trim().toUpperCase();
const normalizeEvidenceFile = (file = {}) => ({
  url: String(file.url || "").trim(),
  key: String(file.key || "").trim(),
  label: String(file.label || "").trim(),
});

const pickClaimSummary = (claim) => {
  if (!claim) return null;
  const status = claim.status;
  const type = claim.type;

  const summary = {
    status,
    type,
    requestedAt: claim.createdAt,
    reasonCode: claim.reasonCode || "",
    customerNote: claim.note || "",
    updatedAt: claim.updatedAt,
    closedAt: claim.closedAt || null,
    decisionNote: claim.decisionNote || "",
    courierName: claim.courierName || "",
    trackingNumber: claim.trackingNumber || "",
    shippedAt: claim.shippedAt || null,
    needsReturnShipment:
      status === CLAIM_STATUS.APPROVED.value && RETURN_SHIPMENT_CLAIM_TYPES.has(type),
    affectedLines: (Array.isArray(claim.affectedLines) ? claim.affectedLines : []).map((line) => ({
      orderItemId: String(line.orderItemId || ""),
      quantity: line.quantity,
      note: line.note || "",
    })),
  };

  if (status === CLAIM_STATUS.REJECTED.value) {
    summary.rejectionReason = claim.decisionNote || "";
  }

  if (claim.resolutionCode) {
    summary.resolutionCode = claim.resolutionCode;
  }
  if (claim.resolutionNote) {
    summary.resolutionNote = claim.resolutionNote;
  }
  if (
    (status === CLAIM_STATUS.COMPLETED.value || status === CLAIM_STATUS.CLOSED.value) &&
    claim.refundAmount != null &&
    Number.isFinite(Number(claim.refundAmount))
  ) {
    summary.refundAmount = Number(claim.refundAmount);
  }

  return summary;
};

const getClaimForOrder = async ({ orderId, orderNo, userId }) => {
  const filter = {};
  if (orderId) filter.orderId = toObjectId(orderId);
  if (orderNo) filter.orderNo = normalizeOrderNo(orderNo);
  if (userId) filter.userId = toObjectId(userId);

  const claim = await OrderClaim.findOne(filter).sort({ createdAt: -1 }).lean();

  return { ok: true, claim: pickClaimSummary(claim) };
};

const validateInitialClaimEvidence = ({ evidence, policySnapshots }) => {
  const snapshots = (Array.isArray(policySnapshots) ? policySnapshots : []).filter(
    (row) => row?.eligibility?.claimsEnabled !== false,
  );
  if (!snapshots.length) {
    return {
      ok: false,
      code: ORDER_CLAIM_ERROR.POLICY_NOT_ELIGIBLE,
      message: "Claims are not enabled for this order",
      errors: [
        {
          path: "order",
          msg: "Claims are not allowed by product policy for this order.",
        },
      ],
      statusCode: 400,
    };
  }

  let minImages = 0;
  let maxImages = 10;

  for (const snapshot of snapshots) {
    const rules = snapshot?.evidenceRules || {};
    minImages = Math.max(minImages, Number(rules.minImages || 0));
    maxImages = Math.min(maxImages, Number(rules.maxImages ?? 10));
  }

  const images = Array.isArray(evidence?.images) ? evidence.images : [];
  if (images.length < minImages || images.length > maxImages) {
    return {
      ok: false,
      code: ORDER_CLAIM_ERROR.EVIDENCE_REQUIRED,
      message: "Invalid image evidence count",
      errors: [
        {
          path: "evidence.images",
          msg: `Images must be between ${minImages} and ${maxImages}.`,
        },
      ],
      statusCode: 400,
    };
  }

  return { ok: true };
};

const submitClaimReturnShipment = async (userId, orderNo, body = {}) => {
  const normalizedOrderNo = normalizeOrderNo(orderNo);
  if (!isValidOrderNoFormat(normalizedOrderNo)) {
    return {
      ok: false,
      code: ORDER_CLAIM_ERROR.INVALID_ORDER_NO,
      message: "Invalid order number",
      errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
      statusCode: 400,
    };
  }

  const order = await Order.findOne({
    userId: toObjectId(userId),
    orderNo: normalizedOrderNo,
  });
  if (!order) {
    return {
      ok: false,
      code: ORDER_CLAIM_ERROR.NOT_FOUND,
      message: "Order not found",
      errors: [{ path: "orderNo", msg: "Order not found." }],
      statusCode: 404,
    };
  }

  const claim = await OrderClaim.findOne({ orderId: order._id }).sort({ createdAt: -1 });
  if (!claim) {
    return {
      ok: false,
      code: ORDER_CLAIM_ERROR.CLAIM_NOT_FOUND,
      message: "Claim not found",
      errors: [{ path: "orderNo", msg: "No claim found for this order." }],
      statusCode: 404,
    };
  }

  if (claim.status !== CLAIM_STATUS.APPROVED.value) {
    return {
      ok: false,
      code: ORDER_CLAIM_ERROR.INVALID_CLAIM_STATUS,
      message: "Return shipment can only be submitted after approval",
      errors: [
        {
          path: "status",
          msg: "Return shipment details can be submitted only after your claim is approved.",
        },
      ],
      statusCode: 400,
    };
  }

  if (!RETURN_SHIPMENT_CLAIM_TYPES.has(claim.type)) {
    return {
      ok: false,
      code: ORDER_CLAIM_ERROR.INVALID_CLAIM_TYPE,
      message: "Return shipment is not required for this claim type",
      errors: [{ path: "type", msg: "This claim type does not require a return shipment." }],
      statusCode: 400,
    };
  }

  const courierReceipt = (body?.evidence?.courierReceipt || [])
    .map(normalizeEvidenceFile)
    .filter((file) => file.url && file.key);

  if (courierReceipt.length === 0) {
    return {
      ok: false,
      code: ORDER_CLAIM_ERROR.EVIDENCE_REQUIRED,
      message: "Courier receipt is required",
      errors: [{ path: "evidence.courierReceipt", msg: "Please upload your courier receipt." }],
      statusCode: 400,
    };
  }

  const courierName = String(body?.customerLogistics?.courierName || body?.courierName || "").trim();
  const trackingNumber = String(
    body?.customerLogistics?.trackingNumber || body?.trackingNumber || "",
  ).trim();
  if (!trackingNumber) {
    return {
      ok: false,
      code: ORDER_CLAIM_ERROR.INVALID_LOGISTICS,
      message: "Tracking number is required",
      errors: [{ path: "trackingNumber", msg: "Please enter the tracking number." }],
      statusCode: 400,
    };
  }

  claim.courierReceipt = courierReceipt;
  claim.courierName = courierName;
  claim.trackingNumber = trackingNumber;
  claim.shippedAt = new Date();
  claim.status = CLAIM_STATUS.IN_TRANSIT.value;
  await claim.save();

  return {
    ok: true,
    claim: pickClaimSummary(claim.toObject()),
  };
};

const createClaimRequest = async (userId, orderNo, body = {}) => {
  const normalizedOrderNo = normalizeOrderNo(orderNo);
  if (!isValidOrderNoFormat(normalizedOrderNo)) {
    return {
      ok: false,
      code: ORDER_CLAIM_ERROR.INVALID_ORDER_NO,
      message: "Invalid order number",
      errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
      statusCode: 400,
    };
  }

  const order = await Order.findOne({
    userId: toObjectId(userId),
    orderNo: normalizedOrderNo,
  });
  if (!order) {
    return {
      ok: false,
      code: ORDER_CLAIM_ERROR.NOT_FOUND,
      message: "Order not found",
      errors: [{ path: "orderNo", msg: "Order not found." }],
      statusCode: 404,
    };
  }

  const type = String(body.type || "").trim().toLowerCase();
  if (!CLAIM_TYPE_SET.has(type)) {
    return {
      ok: false,
      code: ORDER_CLAIM_ERROR.INVALID_CLAIM_TYPE,
      message: "Invalid claim type",
      errors: [{ path: "type", msg: "Please select a valid claim type." }],
      statusCode: 400,
    };
  }

  const reasonCode = String(body.reasonCode || "").trim().toLowerCase();
  if (!CUSTOMER_CLAIM_REASON_SET.has(reasonCode)) {
    return {
      ok: false,
      code: ORDER_CLAIM_ERROR.INVALID_REASON,
      message: "Invalid claim reason",
      errors: [{ path: "reasonCode", msg: "Please select a valid claim reason." }],
      statusCode: 400,
    };
  }

  const note = String(body.note || "").trim();
  if (note.length > CLAIM_NOTE_MAX_LENGTH) {
    return {
      ok: false,
      code: ORDER_CLAIM_ERROR.NOTE_TOO_LONG,
      message: "Claim note is too long",
      errors: [{ path: "note", msg: `Note must be at most ${CLAIM_NOTE_MAX_LENGTH} characters.` }],
      statusCode: 400,
    };
  }

  const [shipment, trackingEvents, items] = await Promise.all([
    Shipment.findOne({ orderId: order._id }).lean(),
    TrackingEvent.find({ orderId: order._id }).select("status eventAt").lean(),
    OrderItem.find({ orderId: order._id }).sort({ createdAt: 1 }).lean(),
  ]);

  const claimWindowDays = items.reduce((maxDays, item) => {
    const days = item?.claimPolicySnapshot?.eligibility?.claimWindowDays;
    if (days === null || days === undefined) return maxDays;
    const parsed = Number(days);
    return Number.isFinite(parsed) ? Math.min(maxDays, parsed) : maxDays;
  }, Infinity);
  const resolvedWindow = claimWindowDays === Infinity ? null : claimWindowDays;

  const eligibility = canRequestClaimForOrder({
    order,
    shipment,
    trackingEvents,
    claimWindowDays: resolvedWindow,
  });
  if (!eligibility.ok) {
    const reasonMap = {
      ORDER_CANCELLED: ORDER_CLAIM_ERROR.ORDER_CANCELLED,
      ORDER_NOT_DELIVERED: ORDER_CLAIM_ERROR.ORDER_NOT_DELIVERED,
      OUTSIDE_CLAIM_WINDOW: ORDER_CLAIM_ERROR.OUTSIDE_CLAIM_WINDOW,
      DELIVERED_MILESTONE_MISSING: ORDER_CLAIM_ERROR.ORDER_NOT_DELIVERED,
    };
    return {
      ok: false,
      code: reasonMap[eligibility.reason] || ORDER_CLAIM_ERROR.ORDER_NOT_DELIVERED,
      message: "Order is not eligible for claim request",
      errors: [
        {
          path: "order",
          msg:
            eligibility.reason === "OUTSIDE_CLAIM_WINDOW"
              ? "Claim request window has expired."
              : "Claim request can only be submitted after delivery.",
        },
      ],
      statusCode: 400,
    };
  }

  const requestedLines = Array.isArray(body.affectedLines) ? body.affectedLines : [];
  const normalizedAffectedLines =
    requestedLines.length === 0
      ? []
      : requestedLines.map((line) => ({
          orderItemId: String(line?.orderItemId || ""),
          quantity: Number(line?.quantity || 0),
          note: String(line?.note || "").trim(),
        }));

  const itemById = new Map(items.map((row) => [String(row._id), row]));
  for (const line of normalizedAffectedLines) {
    const item = itemById.get(line.orderItemId);
    if (!item || !Number.isInteger(line.quantity) || line.quantity <= 0 || line.quantity > item.quantity) {
      return {
        ok: false,
        code: ORDER_CLAIM_ERROR.INVALID_AFFECTED_LINES,
        message: "Invalid affected claim lines",
        errors: [
          {
            path: "affectedLines",
            msg: "Each affected line must reference an order item with valid quantity.",
          },
        ],
        statusCode: 400,
      };
    }
  }

  const scopeOrderItemIds = normalizedAffectedLines.map((line) => line.orderItemId);
  const scopeKey = buildClaimScopeKey(scopeOrderItemIds);
  const existingClaims = await OrderClaim.find({
    orderId: order._id,
    scopeKey,
  })
    .select("scopeKey status")
    .lean();

  if (hasOpenClaimForScope({ claims: existingClaims, scopeKey })) {
    return {
      ok: false,
      code: ORDER_CLAIM_ERROR.DUPLICATE_SCOPE_OPEN_CLAIM,
      message: "An open claim already exists for the selected items",
      errors: [
        {
          path: "affectedLines",
          msg: "An open claim already exists for this claim scope.",
        },
      ],
      statusCode: 409,
    };
  }

  const selectedItems =
    normalizedAffectedLines.length > 0
      ? normalizedAffectedLines.map((line) => itemById.get(line.orderItemId))
      : items;
  const policySnapshots = selectedItems
    .map((row) => row?.claimPolicySnapshot)
    .filter(Boolean);

  const normalizedEvidence = {
    images: (body?.evidence?.images || []).map(normalizeEvidenceFile).filter((f) => f.url && f.key),
  };

  const evidenceValidation = validateInitialClaimEvidence({
    evidence: normalizedEvidence,
    policySnapshots,
  });
  if (!evidenceValidation.ok) {
    return evidenceValidation;
  }

  const claim = await OrderClaim.create({
    orderId: order._id,
    orderNo: order.orderNo,
    userId: order.userId,
    type,
    status: CLAIM_STATUS.PENDING.value,
    reasonCode,
    note,
    affectedLines: normalizedAffectedLines.map((line) => ({
      orderItemId: toObjectId(line.orderItemId),
      quantity: line.quantity,
      note: line.note,
    })),
    scopeKey,
    images: normalizedEvidence.images,
  });

  scheduleClaimLifecycleEmail("submitted", {
    userId: order.userId,
    orderNo: order.orderNo,
    claimType: labelClaimType(type),
  });

  return {
    ok: true,
    claim: pickClaimSummary(claim.toObject()),
  };
};

module.exports = {
  ORDER_CLAIM_ERROR,
  pickClaimSummary,
  getClaimForOrder,
  createClaimRequest,
  submitClaimReturnShipment,
};
