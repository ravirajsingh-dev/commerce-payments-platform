const User = require("../../../models/User");
const emailService = require("../../../infra/email/index");
const { STATUS } = require("../../../shared/constants/order");

const resolveStorefrontBaseUrl = () => {
  const origins = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const storefront =
    origins.find((origin) => !/admin\./i.test(origin)) || origins[0] || "";

  return storefront.replace(/\/+$/g, "");
};

const buildOrderDetailUrl = (orderNo) => {
  const base = resolveStorefrontBaseUrl();
  const path = `/user/orders/${encodeURIComponent(String(orderNo || "").trim())}`;
  return base ? `${base}${path}` : path;
};

const loadCustomerForOrder = async (userId) => {
  if (!userId) {
    return null;
  }
  return User.findById(userId).select("name email").lean();
};

const logEmailFailure = (type, context, result) => {
  console.error(`[ORDER_EMAIL] ${type} failed:`, {
    ...context,
    error: result?.error,
  });
};

/**
 * Order placed confirmation (async; does not block checkout).
 */
const sendOrderPlacedEmail = async (order, userId) => {
  const customer = await loadCustomerForOrder(userId);
  if (!customer?.email) {
    return { success: false, skipped: true, reason: "NO_EMAIL" };
  }

  const result = await emailService.sendOrderPlacedEmail({
    name: customer.name,
    email: customer.email,
    orderNo: order.orderNo,
    orderTotal: order.amounts?.total ?? 0,
    paymentMethod: order.paymentMethod,
    ordersUrl: buildOrderDetailUrl(order.orderNo),
  });

  if (!result.success) {
    logEmailFailure("placed", { orderNo: order.orderNo, userId }, result);
  }

  return result;
};

/**
 * Order shipped notification (when admin sets status to shipped).
 */
const sendOrderShippedEmail = async (order, userId, shipmentMeta = {}) => {
  const customer = await loadCustomerForOrder(userId);
  if (!customer?.email) {
    return { success: false, skipped: true, reason: "NO_EMAIL" };
  }

  const result = await emailService.sendOrderShippedEmail({
    name: customer.name,
    email: customer.email,
    orderNo: order.orderNo,
    ordersUrl: buildOrderDetailUrl(order.orderNo),
    carrierName: shipmentMeta.carrierName || "",
    trackingNumber: shipmentMeta.trackingNumber || "",
    carrierTrackingUrl: shipmentMeta.carrierTrackingUrl || "",
  });

  if (!result.success) {
    logEmailFailure("shipped", { orderNo: order.orderNo, userId }, result);
  }

  return result;
};

const scheduleOrderPlacedEmail = (order, userId) => {
  if (!order || !userId || process.env.JEST_WORKER_ID != null) {
    return;
  }

  setImmediate(() => {
    sendOrderPlacedEmail(order, userId).catch((err) => {
      console.error("[ORDER_EMAIL] placed unhandled error:", order.orderNo, err);
    });
  });
};

const scheduleOrderShippedEmail = (order, previousStatus, shipmentMeta = {}) => {
  if (!order?.userId) {
    return;
  }

  setImmediate(() => {
    if (
      String(previousStatus || "") === STATUS.SHIPPED.value ||
      order.status !== STATUS.SHIPPED.value
    ) {
      return;
    }
    sendOrderShippedEmail(order, order.userId, shipmentMeta).catch((err) => {
      console.error("[ORDER_EMAIL] shipped unhandled error:", order.orderNo, err);
    });
  });
};

const sendClaimLifecycleEmail = async (type, { userId, orderNo, ...meta }) => {
  const customer = await loadCustomerForOrder(userId);
  if (!customer?.email) {
    return { success: false, skipped: true, reason: "NO_EMAIL" };
  }

  const payload = {
    name: customer.name,
    email: customer.email,
    orderNo,
    ordersUrl: buildOrderDetailUrl(orderNo),
    ...meta,
  };

  const senders = {
    submitted: emailService.sendClaimSubmittedEmail,
    approved: emailService.sendClaimApprovedEmail,
    rejected: emailService.sendClaimRejectedEmail,
    completed: emailService.sendClaimCompletedEmail,
  };
  const sender = senders[type];
  if (!sender) {
    return { success: false, skipped: true, reason: "UNKNOWN_TYPE" };
  }

  const result = await sender(payload);
  if (!result.success) {
    logEmailFailure(`claim_${type}`, { orderNo, userId }, result);
  }
  return result;
};

const scheduleClaimLifecycleEmail = (type, payload) => {
  if (!payload?.userId || !payload?.orderNo || process.env.JEST_WORKER_ID != null) {
    return;
  }
  setImmediate(() => {
    sendClaimLifecycleEmail(type, payload).catch((err) => {
      console.error(`[ORDER_EMAIL] claim ${type} unhandled error:`, payload.orderNo, err);
    });
  });
};

module.exports = {
  sendOrderPlacedEmail,
  sendOrderShippedEmail,
  scheduleOrderPlacedEmail,
  scheduleOrderShippedEmail,
  scheduleClaimLifecycleEmail,
  sendClaimLifecycleEmail,
  buildOrderDetailUrl,
  resolveStorefrontBaseUrl,
};
