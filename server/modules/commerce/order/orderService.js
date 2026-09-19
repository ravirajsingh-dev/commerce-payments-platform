const mongoose = require("mongoose");
const Order = require("../../../models/Order");
const OrderItem = require("../../../models/OrderItem");
const { normalizeSize } = require("../cart/cartService");
const { isValidOrderNoFormat } = require("./orderNumberGenerator");
const { canDownloadOrderInvoice } = require("./invoice/invoiceEligibility");
const {
  serializeShipmentSummary,
  loadShipmentsByOrderIds,
  getUserOrderShipmentPayload,
} = require("./shipment/shipmentService");
const OrderClaim = require("../../../models/OrderClaim");
const { pickClaimSummary, getClaimForOrder } = require("./orderClaimService");
const { buildUserClaimEligibility } = require("./orderClaimEligibility");

const ORDER_ERROR = {
  INVALID_ORDER_NO: "INVALID_ORDER_NO",
  NOT_FOUND: "ORDER_NOT_FOUND",
};

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const attributesToPlain = (attrs) => {
  if (attrs == null) return {};
  if (attrs instanceof Map) {
    return Object.fromEntries(attrs.entries());
  }
  return typeof attrs === "object" ? { ...attrs } : {};
};

const parsePagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const serializeEvidenceRules = (rules = {}) => ({
  requiredByTypeReason: Array.isArray(rules.requiredByTypeReason)
    ? rules.requiredByTypeReason.map((row) => ({
        claimType: row?.claimType || "",
        reasonCode: row?.reasonCode || "",
        requiredEvidence: Array.isArray(row?.requiredEvidence)
          ? [...row.requiredEvidence]
          : [],
      }))
    : [],
  minImages: rules.minImages === undefined ? 0 : Number(rules.minImages),
  maxImages: rules.maxImages === undefined ? 10 : Number(rules.maxImages),
  requireCourierReceipt: rules.requireCourierReceipt === true,
  requireDamageProof: rules.requireDamageProof === true,
  requireFitProof: rules.requireFitProof === true,
  requireProductProof: rules.requireProductProof === true,
});

const serializeOrderItem = (row) => ({
  orderItemId: String(row._id),
  productId: String(row.productId),
  variantId: String(row.productVariantId),
  size: normalizeSize(row.size),
  quantity: row.quantity,
  unitPriceSnapshot: row.unitPriceSnapshot,
  lineTotal: row.lineTotal,
  productNameSnapshot: row.productNameSnapshot,
  productSlugSnapshot: row.productSlugSnapshot,
  skuSnapshot: row.skuSnapshot,
  attributesSnapshot: attributesToPlain(row.attributesSnapshot),
  claimPolicySnapshot: row?.claimPolicySnapshot
    ? {
        eligibility: {
          claimsEnabled: row.claimPolicySnapshot?.eligibility?.claimsEnabled !== false,
          claimWindowDays: row.claimPolicySnapshot?.eligibility?.claimWindowDays ?? null,
          allowedClaimTypes: Array.isArray(
            row.claimPolicySnapshot?.eligibility?.allowedClaimTypes,
          )
            ? [...row.claimPolicySnapshot.eligibility.allowedClaimTypes]
            : [],
          allowedClaimReasons: Array.isArray(
            row.claimPolicySnapshot?.eligibility?.allowedClaimReasons,
          )
            ? [...row.claimPolicySnapshot.eligibility.allowedClaimReasons]
            : [],
        },
        evidenceRules: row.claimPolicySnapshot?.evidenceRules
          ? serializeEvidenceRules(row.claimPolicySnapshot.evidenceRules)
          : null,
      }
    : null,
});

const serializeOrderSummary = (order, itemCount, shipment = null, claim = null) => ({
  orderNo: order.orderNo,
  status: order.status,
  paymentStatus: order.paymentStatus,
  paymentMethod: order.paymentMethod,
  amounts: order.amounts,
  couponCode: order.couponCode || "",
  cancellation: {
    requestedAt: order.cancellation?.requestedAt || null,
    reason: order.cancellation?.reason || "",
    note: order.cancellation?.note || "",
  },
  canDownloadInvoice: canDownloadOrderInvoice(order.status),
  shipmentSummary: serializeShipmentSummary(shipment),
  claim,
  itemCount,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const serializeOrderDetail = (order, items, shipmentPayload = null, claim = null) => {
  const shipment = shipmentPayload?.shipment ?? null;
  const trackingEvents = shipmentPayload?.trackingEvents ?? [];
  return {
    ...serializeOrderSummary(order, items.length, shipment, claim),
    addressSnapshot: order.addressSnapshot,
    items: items.map(serializeOrderItem),
    shipment,
    trackingEvents,
    trackingPagination: shipmentPayload?.trackingPagination ?? null,
    claimEligibility: buildUserClaimEligibility({
      order,
      items,
      shipment,
      trackingEvents,
      claim,
    }),
  };
};

const loadItemCountsByOrderId = async (orderIds) => {
  if (!orderIds.length) {
    return new Map();
  }

  const rows = await OrderItem.aggregate([
    { $match: { orderId: { $in: orderIds } } },
    { $group: { _id: "$orderId", itemCount: { $sum: 1 } } },
  ]);

  return new Map(rows.map((row) => [String(row._id), row.itemCount]));
};

const loadLatestClaimsByOrderIds = async (orderIds) => {
  if (!orderIds.length) {
    return new Map();
  }

  const rows = await OrderClaim.find({ orderId: { $in: orderIds } })
    .sort({ createdAt: -1 })
    .lean();

  const latestByOrderId = new Map();
  for (const row of rows) {
    const key = String(row.orderId);
    if (!latestByOrderId.has(key)) {
      latestByOrderId.set(key, pickClaimSummary(row));
    }
  }
  return latestByOrderId;
};

/**
 * Paginated order list for the authenticated user (newest first).
 */
const listUserOrders = async (userId, query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const userObjectId = toObjectId(userId);
  const filter = { userId: userObjectId };

  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const orderIds = orders.map((row) => row._id);
  const [itemCounts, shipmentsByOrderId, claimsByOrderId] = await Promise.all([
    loadItemCountsByOrderId(orderIds),
    loadShipmentsByOrderIds(orderIds),
    loadLatestClaimsByOrderIds(orderIds),
  ]);

  return {
    ok: true,
    orders: orders.map((order) =>
      serializeOrderSummary(
        order,
        itemCounts.get(String(order._id)) || 0,
        shipmentsByOrderId.get(String(order._id)) || null,
        claimsByOrderId.get(String(order._id)) || null,
      ),
    ),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

/**
 * Single order with line items; scoped to the authenticated user.
 */
const getUserOrderByOrderNo = async (userId, orderNo) => {
  const normalizedOrderNo = String(orderNo || "").trim().toUpperCase();

  if (!isValidOrderNoFormat(normalizedOrderNo)) {
    return {
      ok: false,
      code: ORDER_ERROR.INVALID_ORDER_NO,
      message: "Invalid order number",
      errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
      statusCode: 400,
    };
  }

  const order = await Order.findOne({
    userId: toObjectId(userId),
    orderNo: normalizedOrderNo,
  }).lean();

  if (!order) {
    return {
      ok: false,
      code: ORDER_ERROR.NOT_FOUND,
      message: "Order not found",
      errors: [{ path: "orderNo", msg: "Order not found." }],
      statusCode: 404,
    };
  }

  const [items, shipmentPayload, claimResult] = await Promise.all([
    OrderItem.find({ orderId: order._id }).sort({ createdAt: 1 }).lean(),
    getUserOrderShipmentPayload(order._id),
    getClaimForOrder({ orderId: order._id }),
  ]);

  return {
    ok: true,
    order: serializeOrderDetail(order, items, shipmentPayload, claimResult?.claim || null),
  };
};

module.exports = {
  ORDER_ERROR,
  listUserOrders,
  getUserOrderByOrderNo,
  serializeOrderSummary,
  serializeOrderDetail,
  serializeOrderItem,
  loadItemCountsByOrderId,
  loadLatestClaimsByOrderIds,
  parsePagination,
};
