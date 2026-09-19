const mongoose = require("mongoose");
const Order = require("../../../models/Order");
const OrderItem = require("../../../models/OrderItem");
const { releaseStock } = require("../inventory/inventoryService");
const { isValidOrderNoFormat } = require("./orderNumberGenerator");
const { serializeOrderDetail } = require("./orderService");
const { serializeAdminOrderDetail } = require("./orderAdminService");
const {
  CUSTOMER_CANCELLATION_REASON_SET,
  ADMIN_CANCELLATION_REASON_SET,
  CANCELLATION_NOTE_MAX_LENGTH,
} = require("./cancellationReasons");
const {
  STATUS,
  ORDER_PAYMENT_STATUS,
  CANCEL_REQUEST_ELIGIBLE_ORDER_STATUSES,
  ADMIN_CANCEL_BLOCKED_ORDER_STATUSES,
} = require("../../../shared/constants/order");

const ORDER_CANCEL_ERROR = {
  INVALID_ORDER_NO: "INVALID_ORDER_NO",
  NOT_FOUND: "ORDER_NOT_FOUND",
  NOT_ELIGIBLE: "ORDER_NOT_ELIGIBLE",
  ALREADY_REQUESTED: "CANCELLATION_ALREADY_REQUESTED",
  ALREADY_CANCELLED: "ORDER_ALREADY_CANCELLED",
  NOT_CANCELLABLE: "ORDER_NOT_CANCELLABLE",
  INVALID_REASON: "INVALID_CANCELLATION_REASON",
  NOTE_REQUIRED: "CANCELLATION_NOTE_REQUIRED",
  NOTE_TOO_LONG: "CANCELLATION_NOTE_TOO_LONG",
};

const CANCEL_REQUEST_ELIGIBLE_STATUSES = new Set(CANCEL_REQUEST_ELIGIBLE_ORDER_STATUSES);

const ADMIN_CANCEL_BLOCKED_STATUSES = new Set(ADMIN_CANCEL_BLOCKED_ORDER_STATUSES);

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

const releaseOrderLineStock = async (items, session) => {
  for (const item of items) {
    await releaseStock(item.productVariantId, {
      size: item.size || null,
      qty: item.quantity,
      session: session || undefined,
    });
  }
};

const normalizeCancellationPayload = (body = {}, options = {}) => {
  const allowedReasons =
    options.allowedReasons || CUSTOMER_CANCELLATION_REASON_SET;
  const reason = String(body.reason || body.cancellationReason || "")
    .trim()
    .toLowerCase();
  const note = String(body.note || body.cancellationNote || "").trim();

  if (!reason || !allowedReasons.has(reason)) {
    return {
      ok: false,
      code: ORDER_CANCEL_ERROR.INVALID_REASON,
      message: "Invalid cancellation reason",
      errors: [{ path: "reason", msg: "Please select a valid cancellation reason." }],
      statusCode: 400,
    };
  }

  if (reason === "other" && !note) {
    return {
      ok: false,
      code: ORDER_CANCEL_ERROR.NOTE_REQUIRED,
      message: "Cancellation note required",
      errors: [
        {
          path: "note",
          msg: "Please add a short note when selecting Other.",
        },
      ],
      statusCode: 400,
    };
  }

  if (note.length > CANCELLATION_NOTE_MAX_LENGTH) {
    return {
      ok: false,
      code: ORDER_CANCEL_ERROR.NOTE_TOO_LONG,
      message: "Cancellation note is too long",
      errors: [
        {
          path: "note",
          msg: `Note must be at most ${CANCELLATION_NOTE_MAX_LENGTH} characters.`,
        },
      ],
      statusCode: 400,
    };
  }

  return { ok: true, reason, note };
};

const requestOrderCancellation = async (userId, orderNo, body = {}) => {
  const normalizedOrderNo = String(orderNo || "").trim().toUpperCase();

  if (!isValidOrderNoFormat(normalizedOrderNo)) {
    return {
      ok: false,
      code: ORDER_CANCEL_ERROR.INVALID_ORDER_NO,
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
      code: ORDER_CANCEL_ERROR.NOT_FOUND,
      message: "Order not found",
      errors: [{ path: "orderNo", msg: "Order not found." }],
      statusCode: 404,
    };
  }

  if (order.status === STATUS.CANCELLED.value) {
    return {
      ok: false,
      code: ORDER_CANCEL_ERROR.ALREADY_CANCELLED,
      message: "Order is already cancelled",
      errors: [{ path: "order", msg: "This order has already been cancelled." }],
      statusCode: 400,
    };
  }

  if (!CANCEL_REQUEST_ELIGIBLE_STATUSES.has(order.status)) {
    return {
      ok: false,
      code: ORDER_CANCEL_ERROR.NOT_ELIGIBLE,
      message: "Order cannot be cancelled",
      errors: [
        {
          path: "order",
          msg: "Cancellation can only be requested before the order ships.",
        },
      ],
      statusCode: 400,
    };
  }

  if (order.cancellation?.requestedAt) {
    return {
      ok: false,
      code: ORDER_CANCEL_ERROR.ALREADY_REQUESTED,
      message: "Cancellation already requested",
      errors: [
        {
          path: "order",
          msg: "A cancellation request is already pending for this order.",
        },
      ],
      statusCode: 400,
    };
  }

  const payloadResult = normalizeCancellationPayload(body);
  if (!payloadResult.ok) {
    return payloadResult;
  }

  order.cancellation = {
    requestedAt: new Date(),
    reason: payloadResult.reason,
    note: payloadResult.note,
  };
  await order.save();

  const items = await OrderItem.find({ orderId: order._id })
    .sort({ createdAt: 1 })
    .lean();

  return {
    ok: true,
    order: serializeOrderDetail(order.toObject(), items),
  };
};

const cancelOrderAsAdmin = async (orderNo, body = {}, options = {}) => {
  const normalizedOrderNo = String(orderNo || "").trim().toUpperCase();

  if (!isValidOrderNoFormat(normalizedOrderNo)) {
    return {
      ok: false,
      code: ORDER_CANCEL_ERROR.INVALID_ORDER_NO,
      message: "Invalid order number",
      errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
      statusCode: 400,
    };
  }

  const order = await Order.findOne({ orderNo: normalizedOrderNo });
  if (!order) {
    return {
      ok: false,
      code: ORDER_CANCEL_ERROR.NOT_FOUND,
      message: "Order not found",
      errors: [{ path: "orderNo", msg: "Order not found." }],
      statusCode: 404,
    };
  }

  if (ADMIN_CANCEL_BLOCKED_STATUSES.has(order.status)) {
    return {
      ok: false,
      code: ORDER_CANCEL_ERROR.NOT_CANCELLABLE,
      message: "Order cannot be cancelled",
      errors: [
        {
          path: "status",
          msg:
            order.status === STATUS.DELIVERED.value
              ? "Delivered orders cannot be cancelled from the admin panel."
              : "This order is already cancelled.",
        },
      ],
      statusCode: 400,
    };
  }

  const payloadResult = normalizeCancellationPayload(body, {
    allowedReasons: ADMIN_CANCELLATION_REASON_SET,
  });
  if (!payloadResult.ok) {
    return payloadResult;
  }

  const items = await OrderItem.find({ orderId: order._id }).lean();

  const session = await mongoose.startSession();

  try {
    const runCancel = async (activeSession) => {
      await releaseOrderLineStock(items, activeSession);

      order.status = STATUS.CANCELLED.value;
      order.paymentStatus = ORDER_PAYMENT_STATUS.CANCELLED;
      order.cancellation = {
        requestedAt: null,
        reason: payloadResult.reason,
        note: payloadResult.note,
      };
      await order.save(activeSession ? { session: activeSession } : {});

    };

    try {
      await session.withTransaction(async () => {
        await runCancel(session);
      });
    } catch (txErr) {
      if (!isTransactionNotSupported(txErr)) {
        throw txErr;
      }
      await runCancel(null);
    }

    await order.populate("userId", "name email phone");
    const freshItems = await OrderItem.find({ orderId: order._id })
      .sort({ createdAt: 1 })
      .lean();

    return {
      ok: true,
      order: serializeAdminOrderDetail(order.toObject(), freshItems),
    };
  } finally {
    session.endSession();
  }
};

module.exports = {
  ORDER_CANCEL_ERROR,
  CANCEL_REQUEST_ELIGIBLE_STATUSES,
  requestOrderCancellation,
  cancelOrderAsAdmin,
  releaseOrderLineStock,
};
