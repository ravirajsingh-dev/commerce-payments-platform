const mongoose = require("mongoose");
const Order = require("../../../models/Order");
const OrderClaim = require("../../../models/OrderClaim");
const OrderItem = require("../../../models/OrderItem");
const { isValidOrderNoFormat } = require("./orderNumberGenerator");
const { createClaimRequest } = require("./orderClaimService");
const { serializeOrderItem } = require("./orderService");
const {
  CUSTOMER_CLAIM_REASONS,
  ADMIN_RESOLUTIONS,
  ADMIN_CLAIM_RESOLUTION_SET,
} = require("./claimReasons");
const { assertClaimStatusTransition } = require("./claimStatusTransitions");
const { scheduleClaimLifecycleEmail } = require("./orderEmails");
const {
  CLAIM_STATUS,
  CLAIM_STATUS_SET,
  OPEN_CLAIM_STATUS_SET,
  CLAIM_TYPE_LIST,
  CLAIM_STATUS_LIST,
  labelClaimType,
} = require("../../../shared/constants/orderClaim");
const { ORDER_PAYMENT_STATUS } = require("../../../shared/constants/order");
const { releaseStock } = require("../inventory/inventoryService");

const ORDER_CLAIM_ADMIN_ERROR = {
  INVALID_ORDER_NO: "INVALID_ORDER_NO",
  CLAIM_NOT_FOUND: "CLAIM_NOT_FOUND",
  INVALID_STATUS: "INVALID_CLAIM_STATUS",
  INVALID_TRANSITION: "INVALID_CLAIM_TRANSITION",
  ALREADY_DECIDED: "CLAIM_ALREADY_DECIDED",
  INVALID_NOTES: "INVALID_CLAIM_NOTE",
  ALREADY_COMPLETED: "CLAIM_ALREADY_COMPLETED",
  INVALID_RESTOCK_LINES: "INVALID_RESTOCK_LINES",
  INVALID_PAYMENT_STATUS: "INVALID_PAYMENT_STATUS",
  RESTOCK_CONFIRMATION_REQUIRED: "RESTOCK_CONFIRMATION_REQUIRED",
  QC_CONFIRMATION_REQUIRED: "QC_CONFIRMATION_REQUIRED",
  INVALID_RESOLUTION_CODE: "INVALID_RESOLUTION_CODE",
};

const NOTE_MAX_LENGTH = 500;
const PAYMENT_STATUS_SET = new Set(Object.values(ORDER_PAYMENT_STATUS));

const normalizeOrderNo = (orderNo) => String(orderNo || "").trim().toUpperCase();
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const isTransactionNotSupported = (err) => {
  const msg = String(err?.message || "").toLowerCase();
  return (
    err?.code === 20 ||
    msg.includes("replica set") ||
    msg.includes("mongos") ||
    msg.includes("transaction numbers are only allowed")
  );
};

const withOptionalTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    try {
      let result;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } catch (txErr) {
      if (!isTransactionNotSupported(txErr)) {
        throw txErr;
      }
      return work(null);
    }
  } finally {
    session.endSession();
  }
};

const pickClaimAdminPayload = (claim) => ({
  id: String(claim._id),
  orderId: String(claim.orderId),
  orderNo: claim.orderNo,
  userId: String(claim.userId),
  type: claim.type,
  status: claim.status,
  reasonCode: claim.reasonCode || "",
  note: claim.note || "",
  affectedLines: (Array.isArray(claim.affectedLines) ? claim.affectedLines : []).map((line) => ({
    orderItemId: String(line.orderItemId || ""),
    quantity: line.quantity,
    note: line.note || "",
  })),
  scopeKey: claim.scopeKey,
  images: Array.isArray(claim.images) ? claim.images : [],
  courierReceipt: Array.isArray(claim.courierReceipt) ? claim.courierReceipt : [],
  courierName: claim.courierName || "",
  trackingNumber: claim.trackingNumber || "",
  shippedAt: claim.shippedAt || null,
  decisionNote: claim.decisionNote || "",
  resolutionCode: claim.resolutionCode || "",
  resolutionNote: claim.resolutionNote || "",
  refundAmount: claim.refundAmount ?? null,
  restockLines: Array.isArray(claim.restockLines) ? claim.restockLines : [],
  closedAt: claim.closedAt || null,
  createdAt: claim.createdAt,
  updatedAt: claim.updatedAt,
});

const getClaimByOrderNoForAdmin = async (orderNo) => {
  const normalizedOrderNo = normalizeOrderNo(orderNo);
  if (!isValidOrderNoFormat(normalizedOrderNo)) {
    return {
      ok: false,
      code: ORDER_CLAIM_ADMIN_ERROR.INVALID_ORDER_NO,
      message: "Invalid order number",
      errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
      statusCode: 400,
    };
  }

  const claim = await OrderClaim.findOne({ orderNo: normalizedOrderNo })
    .sort({ createdAt: -1 })
    .lean();
  if (!claim) {
    return {
      ok: false,
      code: ORDER_CLAIM_ADMIN_ERROR.CLAIM_NOT_FOUND,
      message: "Claim not found",
      errors: [{ path: "orderNo", msg: "No claim found for this order." }],
      statusCode: 404,
    };
  }

  const orderItems = await OrderItem.find({ orderId: claim.orderId })
    .sort({ createdAt: 1 })
    .lean();

  return {
    ok: true,
    claim: pickClaimAdminPayload(claim),
    orderItems: orderItems.map(serializeOrderItem),
  };
};

const CLAIM_SORT_FIELD_MAP = {
  createdAt: "createdAt",
  orderNo: "orderNo",
  status: "status",
  requestedAt: "createdAt",
};

const buildClaimsListFilter = (query = {}) => {
  const filter = {};
  const status = String(query.status || "").trim().toLowerCase();
  if (status) {
    if (!CLAIM_STATUS_SET.has(status)) {
      return { error: ORDER_CLAIM_ADMIN_ERROR.INVALID_STATUS };
    }
    filter.status = status;
  }

  const orderNo = String(query.orderNo || "").trim().toUpperCase();
  if (orderNo) {
    filter.orderNo = new RegExp(orderNo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  const userId = String(query.userId || "").trim();
  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { error: "INVALID_USER_ID" };
    }
    filter.userId = toObjectId(userId);
  }

  const fromDate = query.fromDate ? new Date(query.fromDate) : null;
  const toDate = query.toDate ? new Date(query.toDate) : null;
  if (fromDate && !Number.isNaN(fromDate.getTime())) {
    filter.createdAt = filter.createdAt || {};
    filter.createdAt.$gte = fromDate;
  }
  if (toDate && !Number.isNaN(toDate.getTime())) {
    filter.createdAt = filter.createdAt || {};
    filter.createdAt.$lte = toDate;
  }

  return { filter };
};

const buildClaimsListSort = (query = {}) => {
  const requestedField = String(query.orderBy || "requestedAt").trim();
  const sortField = CLAIM_SORT_FIELD_MAP[requestedField] || "createdAt";
  const ascending = String(query.ascending || "desc").trim().toLowerCase();
  const direction = ascending === "asc" ? 1 : -1;
  return { [sortField]: direction, createdAt: direction };
};

const listClaimsForAdmin = async (query = {}) => {
  const built = buildClaimsListFilter(query);
  if (built.error) {
    return {
      ok: false,
      code: built.error,
      message:
        built.error === "INVALID_USER_ID"
          ? "Invalid user filter"
          : "Invalid claim status filter",
      errors: [
        {
          path: built.error === "INVALID_USER_ID" ? "userId" : "status",
          msg:
            built.error === "INVALID_USER_ID"
              ? "Invalid user id."
              : "Invalid claim status.",
        },
      ],
      statusCode: 400,
    };
  }

  const filter = built.filter;
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const sort = buildClaimsListSort(query);

  const [total, claims] = await Promise.all([
    OrderClaim.countDocuments(filter),
    OrderClaim.find(filter).sort(sort).skip(skip).limit(limit).lean(),
  ]);

  return {
    ok: true,
    claims: claims.map(pickClaimAdminPayload),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

const ensureMutableClaim = (claim) => {
  if (
    claim.status === CLAIM_STATUS.REJECTED.value ||
    claim.status === CLAIM_STATUS.COMPLETED.value ||
    claim.status === CLAIM_STATUS.CLOSED.value
  ) {
    return {
      ok: false,
      code: ORDER_CLAIM_ADMIN_ERROR.INVALID_TRANSITION,
      message: "Claim is no longer mutable",
      errors: [{ path: "status", msg: "Closed/rejected/completed claims cannot be updated." }],
      statusCode: 400,
    };
  }
  return { ok: true };
};

const approveClaimForOrder = async (orderNo, body = {}, options = {}) =>
  withOptionalTransaction(async (session) => {
    const normalizedOrderNo = normalizeOrderNo(orderNo);
    if (!isValidOrderNoFormat(normalizedOrderNo)) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.INVALID_ORDER_NO,
        message: "Invalid order number",
        errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
        statusCode: 400,
      };
    }

    const claim = await OrderClaim.findOne({ orderNo: normalizedOrderNo })
      .sort({ createdAt: -1 })
      .session(session || null);
    if (!claim) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.CLAIM_NOT_FOUND,
        message: "Claim not found",
        errors: [{ path: "orderNo", msg: "No claim found for this order." }],
        statusCode: 404,
      };
    }

    if (claim.status !== CLAIM_STATUS.PENDING.value) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.ALREADY_DECIDED,
        message: "Claim is already decided",
        errors: [{ path: "status", msg: "Only pending claims can be approved." }],
        statusCode: 400,
      };
    }

    const note = String(body.decisionNote || body.note || "").trim();
    if (note.length > NOTE_MAX_LENGTH) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.INVALID_NOTES,
        message: "Decision note is too long",
        errors: [{ path: "decisionNote", msg: `Decision note must be <= ${NOTE_MAX_LENGTH}.` }],
        statusCode: 400,
      };
    }

    claim.status = CLAIM_STATUS.APPROVED.value;
    claim.decisionNote = note;
    await claim.save(session ? { session } : {});

    scheduleClaimLifecycleEmail("approved", {
      userId: claim.userId,
      orderNo: claim.orderNo,
      claimType: labelClaimType(claim.type),
      decisionNote: note,
    });

    return { ok: true, claim: pickClaimAdminPayload(claim.toObject()) };
  });

const rejectClaimForOrder = async (orderNo, body = {}, options = {}) =>
  withOptionalTransaction(async (session) => {
    const normalizedOrderNo = normalizeOrderNo(orderNo);
    if (!isValidOrderNoFormat(normalizedOrderNo)) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.INVALID_ORDER_NO,
        message: "Invalid order number",
        errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
        statusCode: 400,
      };
    }

    const claim = await OrderClaim.findOne({ orderNo: normalizedOrderNo })
      .sort({ createdAt: -1 })
      .session(session || null);
    if (!claim) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.CLAIM_NOT_FOUND,
        message: "Claim not found",
        errors: [{ path: "orderNo", msg: "No claim found for this order." }],
        statusCode: 404,
      };
    }
    if (claim.status !== CLAIM_STATUS.PENDING.value) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.ALREADY_DECIDED,
        message: "Claim is already decided",
        errors: [{ path: "status", msg: "Only pending claims can be rejected." }],
        statusCode: 400,
      };
    }

    const note = String(body.decisionNote || body.note || "").trim();
    if (!note) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.INVALID_NOTES,
        message: "Rejection note is required",
        errors: [{ path: "decisionNote", msg: "Please provide rejection reason." }],
        statusCode: 400,
      };
    }
    if (note.length > NOTE_MAX_LENGTH) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.INVALID_NOTES,
        message: "Rejection note is too long",
        errors: [{ path: "decisionNote", msg: `Decision note must be <= ${NOTE_MAX_LENGTH}.` }],
        statusCode: 400,
      };
    }

    claim.status = CLAIM_STATUS.REJECTED.value;
    claim.decisionNote = note;
    claim.closedAt = new Date();
    await claim.save(session ? { session } : {});

    scheduleClaimLifecycleEmail("rejected", {
      userId: claim.userId,
      orderNo: claim.orderNo,
      claimType: labelClaimType(claim.type),
      decisionNote: note,
    });

    return { ok: true, claim: pickClaimAdminPayload(claim.toObject()) };
  });

const patchClaimForOrder = async (orderNo, body = {}, options = {}) =>
  withOptionalTransaction(async (session) => {
    const normalizedOrderNo = normalizeOrderNo(orderNo);
    if (!isValidOrderNoFormat(normalizedOrderNo)) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.INVALID_ORDER_NO,
        message: "Invalid order number",
        errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
        statusCode: 400,
      };
    }

    const claim = await OrderClaim.findOne({ orderNo: normalizedOrderNo })
      .sort({ createdAt: -1 })
      .session(session || null);
    if (!claim) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.CLAIM_NOT_FOUND,
        message: "Claim not found",
        errors: [{ path: "orderNo", msg: "No claim found for this order." }],
        statusCode: 404,
      };
    }

    const mutable = ensureMutableClaim(claim);
    if (!mutable.ok) return mutable;

    const updates = {};
    if (body.status !== undefined) {
      const status = String(body.status || "").trim().toLowerCase();
      if (!CLAIM_STATUS_SET.has(status)) {
        return {
          ok: false,
          code: ORDER_CLAIM_ADMIN_ERROR.INVALID_STATUS,
          message: "Invalid claim status",
          errors: [{ path: "status", msg: "Invalid claim status." }],
          statusCode: 400,
        };
      }
      updates.status = status;
    }

    if (updates.status) {
      const transition = assertClaimStatusTransition(claim.status, updates.status);
      if (!transition.ok) {
        return {
          ok: false,
          code: ORDER_CLAIM_ADMIN_ERROR.INVALID_TRANSITION,
          message: "Invalid claim status transition",
          errors: [{ path: "status", msg: transition.message }],
          statusCode: 400,
        };
      }
    }

    const adminNote = String(body.adminNote || "").trim();
    if (body.adminNote !== undefined && adminNote.length > NOTE_MAX_LENGTH) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.INVALID_NOTES,
        message: "Admin note is too long",
        errors: [{ path: "adminNote", msg: `Admin note must be <= ${NOTE_MAX_LENGTH}.` }],
        statusCode: 400,
      };
    }

    if (Object.keys(updates).length === 0 && body.adminNote === undefined && !body.courierName && !body.trackingNumber && !body.customerLogistics) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.INVALID_TRANSITION,
        message: "No updates provided",
        errors: [{ path: "body", msg: "Provide claim status or operational details." }],
        statusCode: 400,
      };
    }

    if (updates.status) {
      claim.status = updates.status;
      if (updates.status === CLAIM_STATUS.CLOSED.value) {
        claim.closedAt = new Date();
      }
    }
    if (body.adminNote !== undefined) {
      claim.resolutionNote = adminNote;
    }
    const logistics = body.customerLogistics && typeof body.customerLogistics === "object"
      ? body.customerLogistics
      : {};
    if (body.courierName !== undefined || logistics.courierName !== undefined) {
      claim.courierName = String(body.courierName ?? logistics.courierName ?? "").trim();
    }
    if (body.trackingNumber !== undefined || logistics.trackingNumber !== undefined) {
      claim.trackingNumber = String(body.trackingNumber ?? logistics.trackingNumber ?? "").trim();
    }

    await claim.save(session ? { session } : {});
    return { ok: true, claim: pickClaimAdminPayload(claim.toObject()) };
  });

const createClaimRequestAsAdmin = async (orderNo, body = {}) => {
  const normalizedOrderNo = normalizeOrderNo(orderNo);
  if (!isValidOrderNoFormat(normalizedOrderNo)) {
    return {
      ok: false,
      code: ORDER_CLAIM_ADMIN_ERROR.INVALID_ORDER_NO,
      message: "Invalid order number",
      errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
      statusCode: 400,
    };
  }

  const order = await Order.findOne({ orderNo: normalizedOrderNo }).select("userId orderNo").lean();
  if (!order) {
    return {
      ok: false,
      code: ORDER_CLAIM_ADMIN_ERROR.CLAIM_NOT_FOUND,
      message: "Order not found",
      errors: [{ path: "orderNo", msg: "Order not found." }],
      statusCode: 404,
    };
  }

  const result = await createClaimRequest(String(order.userId), order.orderNo, body);
  if (!result.ok) return result;
  return {
    ok: true,
    claim: result.claim,
  };
};

const completeClaimForOrder = async (orderNo, body = {}, options = {}) =>
  withOptionalTransaction(async (session) => {
    const normalizedOrderNo = normalizeOrderNo(orderNo);
    if (!isValidOrderNoFormat(normalizedOrderNo)) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.INVALID_ORDER_NO,
        message: "Invalid order number",
        errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
        statusCode: 400,
      };
    }

    const claim = await OrderClaim.findOne({ orderNo: normalizedOrderNo })
      .sort({ createdAt: -1 })
      .session(session || null);
    if (!claim) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.CLAIM_NOT_FOUND,
        message: "Claim not found",
        errors: [{ path: "orderNo", msg: "No claim found for this order." }],
        statusCode: 404,
      };
    }

    if (
      claim.status === CLAIM_STATUS.COMPLETED.value ||
      claim.status === CLAIM_STATUS.CLOSED.value
    ) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.ALREADY_COMPLETED,
        message: "Claim is already completed",
        errors: [{ path: "status", msg: "Completed/closed claim cannot be completed again." }],
        statusCode: 409,
      };
    }
    if (claim.status === CLAIM_STATUS.REJECTED.value) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.INVALID_TRANSITION,
        message: "Rejected claim cannot be completed",
        errors: [{ path: "status", msg: "Rejected claim cannot be completed." }],
        statusCode: 400,
      };
    }

    const resolutionCode = String(body.resolutionCode || "").trim().toLowerCase();
    const resolutionNote = String(body.resolutionNote || "").trim();
    if (!resolutionCode) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.INVALID_NOTES,
        message: "Resolution code is required",
        errors: [{ path: "resolutionCode", msg: "Resolution code is required." }],
        statusCode: 400,
      };
    }
    if (resolutionNote.length > NOTE_MAX_LENGTH) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.INVALID_NOTES,
        message: "Resolution note is too long",
        errors: [{ path: "resolutionNote", msg: `Resolution note must be <= ${NOTE_MAX_LENGTH}.` }],
        statusCode: 400,
      };
    }
    if (!ADMIN_CLAIM_RESOLUTION_SET.has(resolutionCode)) {
      return {
        ok: false,
        code: ORDER_CLAIM_ADMIN_ERROR.INVALID_RESOLUTION_CODE,
        message: "Invalid resolution code",
        errors: [{ path: "resolutionCode", msg: "Invalid resolution code." }],
        statusCode: 400,
      };
    }

    const paymentStatusRaw = body.paymentStatus;
    if (paymentStatusRaw !== undefined) {
      const normalizedPaymentStatus = String(paymentStatusRaw).trim().toLowerCase();
      if (!PAYMENT_STATUS_SET.has(normalizedPaymentStatus)) {
        return {
          ok: false,
          code: ORDER_CLAIM_ADMIN_ERROR.INVALID_PAYMENT_STATUS,
          message: "Invalid payment status",
          errors: [{ path: "paymentStatus", msg: "Invalid payment status." }],
          statusCode: 400,
        };
      }
    }

    const order = await Order.findById(claim.orderId).session(session || null);
    const items = await OrderItem.find({ orderId: claim.orderId }).session(session || null);
    const itemById = new Map(items.map((row) => [String(row._id), row]));

    const restockLines = Array.isArray(body.restockLines) ? body.restockLines : [];
    for (const line of restockLines) {
      const orderItemId = String(line?.orderItemId || "");
      const quantity = Number(line?.quantity || 0);
      const item = itemById.get(orderItemId);
      if (!item || !Number.isInteger(quantity) || quantity <= 0 || quantity > item.quantity) {
        return {
          ok: false,
          code: ORDER_CLAIM_ADMIN_ERROR.INVALID_RESTOCK_LINES,
          message: "Invalid restock lines",
          errors: [
            {
              path: "restockLines",
              msg: "Each restock line must reference claim order items with valid quantity.",
            },
          ],
          statusCode: 400,
        };
      }

      const nonRestockableByDefault =
        item?.claimPolicySnapshot?.restockPolicy?.bespokeNonRestockableByDefault === true;
      if (nonRestockableByDefault && line?.adminConfirmRestock !== true) {
        return {
          ok: false,
          code: ORDER_CLAIM_ADMIN_ERROR.RESTOCK_CONFIRMATION_REQUIRED,
          message: "Bespoke restock requires explicit admin confirmation",
          errors: [
            {
              path: "restockLines",
              msg: "Set adminConfirmRestock=true for bespoke/non-restockable lines.",
            },
          ],
          statusCode: 400,
        };
      }
    }

    if (restockLines.length > 0) {
      const bodyQcConfirmed = body.adminConfirmQc === true;
      for (const line of restockLines) {
        const item = itemById.get(String(line.orderItemId));
        const requiresQc =
          item?.claimPolicySnapshot?.restockPolicy?.requireQcForRestock !== false;
        if (requiresQc && !bodyQcConfirmed && line?.adminConfirmQc !== true) {
          return {
            ok: false,
            code: ORDER_CLAIM_ADMIN_ERROR.QC_CONFIRMATION_REQUIRED,
            message: "QC confirmation is required before restocking",
            errors: [
              {
                path: "restockLines",
                msg: "Set adminConfirmQc=true when policy requires QC before restock.",
              },
            ],
            statusCode: 400,
          };
        }
      }
    }

    claim.resolutionCode = resolutionCode;
    claim.resolutionNote = resolutionNote;

    const restockedRows = [];
    for (const line of restockLines) {
      const orderItemId = String(line.orderItemId);
      const quantity = Number(line.quantity);
      const item = itemById.get(orderItemId);

      await releaseStock(item.productVariantId, {
        size: item.size || null,
        qty: quantity,
        session: session || undefined,
      });
      restockedRows.push({
        orderItemId: item._id,
        quantity,
        restockedAt: new Date(),
      });
    }
    claim.restockLines = restockedRows;

    if (body.refundAmount !== undefined && body.refundAmount !== null && body.refundAmount !== "") {
      claim.refundAmount = Number(body.refundAmount);
    }

    if (paymentStatusRaw !== undefined) {
      const normalizedPaymentStatus = String(paymentStatusRaw).trim().toLowerCase();
      order.paymentStatus = normalizedPaymentStatus;
      await order.save(session ? { session } : {});
    }

    claim.status = CLAIM_STATUS.COMPLETED.value;
    claim.closedAt = new Date();
    await claim.save(session ? { session } : {});

    scheduleClaimLifecycleEmail("completed", {
      userId: claim.userId,
      orderNo: claim.orderNo,
      claimType: labelClaimType(claim.type),
      resolutionNote,
      refundAmount: claim.refundAmount,
    });

    return { ok: true, claim: pickClaimAdminPayload(claim.toObject()) };
  });

const getClaimCatalogForAdmin = () => ({
  ok: true,
  catalog: {
    types: CLAIM_TYPE_LIST,
    statuses: CLAIM_STATUS_LIST,
    customerReasons: CUSTOMER_CLAIM_REASONS,
    resolutionCodes: ADMIN_RESOLUTIONS,
  },
});

const countPendingClaims = async () =>
  OrderClaim.countDocuments({ status: { $in: [...OPEN_CLAIM_STATUS_SET] } });

const applyPendingClaimFilter = async (filter = {}, pendingClaim) => {
  const normalized = String(pendingClaim || "").trim().toLowerCase();
  if (!["true", "1", "yes"].includes(normalized)) {
    return filter;
  }

  const orderIds = await OrderClaim.distinct("orderId", {
    status: { $in: [...OPEN_CLAIM_STATUS_SET] },
  });
  return {
    ...filter,
    _id: { $in: orderIds },
  };
};

module.exports = {
  ORDER_CLAIM_ADMIN_ERROR,
  pickClaimAdminPayload,
  listClaimsForAdmin,
  getClaimByOrderNoForAdmin,
  approveClaimForOrder,
  rejectClaimForOrder,
  patchClaimForOrder,
  createClaimRequestAsAdmin,
  completeClaimForOrder,
  countPendingClaims,
  applyPendingClaimFilter,
  getClaimCatalogForAdmin,
};
