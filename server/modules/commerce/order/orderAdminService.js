const mongoose = require("mongoose");
const Order = require("../../../models/Order");
const User = require("../../../models/User");
const OrderItem = require("../../../models/OrderItem");
const {
  serializeOrderSummary,
  serializeOrderDetail,
  loadItemCountsByOrderId,
  parsePagination,
} = require("./orderService");
const { isValidOrderNoFormat } = require("./orderNumberGenerator");
const { scheduleOrderShippedEmail } = require("./orderEmails");
const { getClaimForOrder, pickClaimSummary } = require("./orderClaimService");
const OrderClaim = require("../../../models/OrderClaim");
const {
  countPendingClaims,
  applyPendingClaimFilter,
} = require("./orderClaimAdminService");

const {
  STATUS,
  STATUS_SET,
  STATUS_VALUES,
  ORDER_PAYMENT_METHOD,
  ORDER_PAYMENT_STATUS,
} = require("../../../shared/constants/order");

const ORDER_ADMIN_ERROR = {
  INVALID_ORDER_NO: "INVALID_ORDER_NO",
  NOT_FOUND: "ORDER_NOT_FOUND",
  INVALID_STATUS: "INVALID_STATUS",
  INVALID_PAYMENT_STATUS: "INVALID_PAYMENT_STATUS",
  NO_UPDATES: "NO_UPDATES",
};

const ORDER_STATUS_SET = STATUS_SET;
const PAYMENT_STATUS_SET = new Set(Object.values(ORDER_PAYMENT_STATUS));
const ADMIN_SORT_FIELD_MAP = {
  createdAt: "createdAt",
  orderNo: "orderNo",
  status: "status",
  "amounts.total": "amounts.total",
};

const PENDING_CANCEL_REQUEST_FILTER = {
  "cancellation.requestedAt": { $ne: null },
  status: { $ne: STATUS.CANCELLED.value },
};

const parseBooleanQuery = (value) => {
  if (value === undefined || value === null || value === "") {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const buildAdminSort = (query = {}) => {
  const requestedField = String(query.orderBy || "createdAt").trim();
  const sortField = ADMIN_SORT_FIELD_MAP[requestedField] || "createdAt";
  const ascending = String(query.ascending || "desc").trim().toLowerCase();
  const direction = ascending === "asc" ? 1 : -1;
  return { [sortField]: direction };
};

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const serializeCustomer = (user) => {
  if (!user) return null;
  const id = user._id || user;
  return {
    id: String(id),
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
  };
};

const serializeAdminOrderSummary = (order, itemCount, claim = null) => ({
  ...serializeOrderSummary(order, itemCount, null, claim),
  userId: String(order.userId?._id || order.userId || ""),
  customer: serializeCustomer(order.userId),
});

const serializeAdminOrderDetail = (order, items, claim = null) => ({
  ...serializeOrderDetail(order, items, null, claim),
  userId: String(order.userId?._id || order.userId || ""),
  customer: serializeCustomer(order.userId),
});

const buildAdminListFilter = (query = {}) => {
  const filter = {};

  const status = String(query.status || "").trim().toLowerCase();
  if (status) {
    if (!ORDER_STATUS_SET.has(status)) {
      return { error: ORDER_ADMIN_ERROR.INVALID_STATUS };
    }
    filter.status = status;
  }

  const paymentStatus = String(query.paymentStatus || "").trim().toLowerCase();
  if (paymentStatus) {
    if (!PAYMENT_STATUS_SET.has(paymentStatus)) {
      return { error: ORDER_ADMIN_ERROR.INVALID_PAYMENT_STATUS };
    }
    filter.paymentStatus = paymentStatus;
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

  const fromDate = String(query.fromDate || "").trim();
  const toDate = String(query.toDate || "").trim();
  if (parseBooleanQuery(query.pendingCancelRequest)) {
    Object.assign(filter, PENDING_CANCEL_REQUEST_FILTER);
  }

  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) {
      const start = new Date(`${fromDate}T00:00:00.000Z`);
      if (!Number.isNaN(start.getTime())) {
        filter.createdAt.$gte = start;
      }
    }
    if (toDate) {
      const end = new Date(`${toDate}T23:59:59.999Z`);
      if (!Number.isNaN(end.getTime())) {
        filter.createdAt.$lte = end;
      }
    }
    if (Object.keys(filter.createdAt).length === 0) {
      delete filter.createdAt;
    }
  }

  return { filter };
};

const buildStatusSummary = async (baseFilter = {}) => {
  const rows = await Order.aggregate([
    { $match: baseFilter },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const summary = Object.fromEntries(
    STATUS_VALUES.map((status) => [status, 0]),
  );

  for (const row of rows) {
    if (row._id && Object.hasOwn(summary, row._id)) {
      summary[row._id] = row.count;
    }
  }

  return summary;
};

const countPendingCancelRequests = async () =>
  Order.countDocuments(PENDING_CANCEL_REQUEST_FILTER);

const listAdminOrders = async (query = {}) => {
  const filterResult = buildAdminListFilter(query);
  if (filterResult.error === ORDER_ADMIN_ERROR.INVALID_STATUS) {
    return {
      ok: false,
      code: filterResult.error,
      message: "Invalid order status filter",
      errors: [{ path: "status", msg: "Invalid order status." }],
      statusCode: 400,
    };
  }
  if (filterResult.error === ORDER_ADMIN_ERROR.INVALID_PAYMENT_STATUS) {
    return {
      ok: false,
      code: filterResult.error,
      message: "Invalid payment status filter",
      errors: [{ path: "paymentStatus", msg: "Invalid payment status." }],
      statusCode: 400,
    };
  }
  if (filterResult.error === "INVALID_USER_ID") {
    return {
      ok: false,
      code: "INVALID_USER_ID",
      message: "Invalid user id filter",
      errors: [{ path: "userId", msg: "Invalid user id." }],
      statusCode: 400,
    };
  }

  const { page, limit, skip } = parsePagination(query);
  const filter = await applyPendingClaimFilter(filterResult.filter, query.pendingClaim);
  const sort = buildAdminSort(query);

  const [total, orders, summary, pendingCancelRequestCount, pendingClaimCount] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .populate("userId", "name email phone")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    buildStatusSummary(filter),
    countPendingCancelRequests(),
    countPendingClaims(),
  ]);

  const orderIds = orders.map((row) => row._id);
  const [itemCounts, claimRows] = await Promise.all([
    loadItemCountsByOrderId(orderIds),
    OrderClaim.find({ orderId: { $in: orderIds } })
      .sort({ createdAt: -1 })
      .lean(),
  ]);
  const latestClaimByOrderId = new Map();
  for (const claim of claimRows) {
    const key = String(claim.orderId);
    if (!latestClaimByOrderId.has(key)) {
      latestClaimByOrderId.set(key, pickClaimSummary(claim));
    }
  }

  return {
    ok: true,
    orders: orders.map((order) =>
      serializeAdminOrderSummary(
        order,
        itemCounts.get(String(order._id)) || 0,
        latestClaimByOrderId.get(String(order._id)) || null,
      ),
    ),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    summary,
    pendingCancelRequestCount,
    pendingClaimCount,
  };
};

const getAdminOrderByOrderNo = async (orderNo) => {
  const normalizedOrderNo = String(orderNo || "").trim().toUpperCase();

  if (!isValidOrderNoFormat(normalizedOrderNo)) {
    return {
      ok: false,
      code: ORDER_ADMIN_ERROR.INVALID_ORDER_NO,
      message: "Invalid order number",
      errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
      statusCode: 400,
    };
  }

  const order = await Order.findOne({ orderNo: normalizedOrderNo })
    .populate("userId", "name email phone")
    .lean();

  if (!order) {
    return {
      ok: false,
      code: ORDER_ADMIN_ERROR.NOT_FOUND,
      message: "Order not found",
      errors: [{ path: "orderNo", msg: "Order not found." }],
      statusCode: 404,
    };
  }

  const items = await OrderItem.find({ orderId: order._id })
    .sort({ createdAt: 1 })
    .lean();

  const claimResult = await getClaimForOrder({ orderId: order._id });
  return {
    ok: true,
    order: serializeAdminOrderDetail(order, items, claimResult?.claim || null),
  };
};

const updateAdminOrder = async (orderNo, body = {}, options = {}) => {
  const normalizedOrderNo = String(orderNo || "").trim().toUpperCase();

  if (!isValidOrderNoFormat(normalizedOrderNo)) {
    return {
      ok: false,
      code: ORDER_ADMIN_ERROR.INVALID_ORDER_NO,
      message: "Invalid order number",
      errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
      statusCode: 400,
    };
  }

  const order = await Order.findOne({ orderNo: normalizedOrderNo });
  if (!order) {
    return {
      ok: false,
      code: ORDER_ADMIN_ERROR.NOT_FOUND,
      message: "Order not found",
      errors: [{ path: "orderNo", msg: "Order not found." }],
      statusCode: 404,
    };
  }

  const updates = {};

  if (body.status !== undefined) {
    const status = String(body.status).trim().toLowerCase();
    if (!ORDER_STATUS_SET.has(status)) {
      return {
        ok: false,
        code: ORDER_ADMIN_ERROR.INVALID_STATUS,
        message: "Invalid order status",
        errors: [{ path: "status", msg: "Invalid order status." }],
        statusCode: 400,
      };
    }
    if (status === "cancelled") {
      return {
        ok: false,
        code: "USE_CANCEL_ENDPOINT",
        message: "Use cancel order action",
        errors: [
          {
            path: "status",
            msg: "Use POST /api/admin/orders/:orderNo/cancel to cancel and restore stock.",
          },
        ],
        statusCode: 400,
      };
    }
    updates.status = status;
  }

  if (body.paymentStatus !== undefined) {
    const paymentStatus = String(body.paymentStatus).trim().toLowerCase();
    if (!PAYMENT_STATUS_SET.has(paymentStatus)) {
      return {
        ok: false,
        code: ORDER_ADMIN_ERROR.INVALID_PAYMENT_STATUS,
        message: "Invalid payment status",
        errors: [{ path: "paymentStatus", msg: "Invalid payment status." }],
        statusCode: 400,
      };
    }
    updates.paymentStatus = paymentStatus;
  }

  if (Object.keys(updates).length === 0) {
    return {
      ok: false,
      code: ORDER_ADMIN_ERROR.NO_UPDATES,
      message: "No updates provided",
      errors: [{ path: "body", msg: "Provide status or payment status." }],
      statusCode: 400,
    };
  }

  const previous = {
    status: order.status,
    paymentStatus: order.paymentStatus,
  };

  Object.assign(order, updates);
  if (
    updates.status === STATUS.DELIVERED.value &&
    order.paymentMethod === ORDER_PAYMENT_METHOD.COD &&
    updates.paymentStatus === undefined &&
    order.paymentStatus !== ORDER_PAYMENT_STATUS.COD_PAID
  ) {
    order.paymentStatus = ORDER_PAYMENT_STATUS.COD_PAID;
  }
  await order.save();

  if (previous.status !== STATUS.SHIPPED.value && order.status === STATUS.SHIPPED.value) {
    scheduleOrderShippedEmail(order, previous.status);
  }

  await order.populate("userId", "name email phone");
  const items = await OrderItem.find({ orderId: order._id })
    .sort({ createdAt: 1 })
    .lean();

  const claimResult = await getClaimForOrder({ orderId: order._id });
  return {
    ok: true,
    order: serializeAdminOrderDetail(order.toObject(), items, claimResult?.claim || null),
  };
};

const listAdminOrdersByUserId = async (userId, query = {}) => {
  const normalizedUserId = String(userId || "").trim();

  if (!mongoose.Types.ObjectId.isValid(normalizedUserId)) {
    return {
      ok: false,
      code: "INVALID_USER_ID",
      message: "Invalid user id",
      errors: [{ path: "userId", msg: "Invalid user id." }],
      statusCode: 400,
    };
  }

  const userExists = await User.exists({ _id: normalizedUserId });
  if (!userExists) {
    return {
      ok: false,
      code: "USER_NOT_FOUND",
      message: "User not found",
      errors: [{ path: "userId", msg: "User not found." }],
      statusCode: 404,
    };
  }

  return listAdminOrders({
    ...query,
    userId: normalizedUserId,
  });
};

module.exports = {
  ORDER_ADMIN_ERROR,
  ORDER_PAYMENT_STATUS,
  serializeAdminOrderDetail,
  listAdminOrders,
  listAdminOrdersByUserId,
  getAdminOrderByOrderNo,
  updateAdminOrder,
};
