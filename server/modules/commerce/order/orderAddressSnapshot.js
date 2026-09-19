const mongoose = require("mongoose");
const Order = require("../../../models/Order");
const OrderItem = require("../../../models/OrderItem");
const { validateAndNormalizeOrderAddressSnapshot } = require("../address/validateCheckoutAddress");
const { CHECKOUT_ADDRESS_SNAPSHOT_FIELDS } = require("../address/checkoutAddressShape");
const { isValidOrderNoFormat } = require("./orderNumberGenerator");
const { serializeAdminOrderDetail } = require("./orderAdminService");
const { STATUS } = require("../../../shared/constants/order");
const ORDER_ADDRESS_ERROR = {
  INVALID_ORDER_NO: "INVALID_ORDER_NO",
  NOT_FOUND: "ORDER_NOT_FOUND",
  INVALID_ADDRESS: "INVALID_ADDRESS",
  NO_CHANGES: "NO_CHANGES",
  ORDER_CANCELLED: "ORDER_CANCELLED",
};

const snapshotToPlain = (snapshot) => {
  if (!snapshot) return {};
  if (typeof snapshot.toObject === "function") {
    return snapshot.toObject();
  }
  return { ...snapshot };
};

const pickInlineSnapshotFields = (snapshot = {}) => {
  const plain = snapshotToPlain(snapshot);
  const picked = {};
  for (const field of CHECKOUT_ADDRESS_SNAPSHOT_FIELDS) {
    if (field === "userAddressId") continue;
    if (plain[field] !== undefined) {
      picked[field] = plain[field];
    }
  }
  return picked;
};

const snapshotsEqual = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

const buildMergedSnapshotInput = (existingSnapshot, incomingSnapshot = {}) => {
  const existing = snapshotToPlain(existingSnapshot);
  const merged = {
    ...pickInlineSnapshotFields(existing),
    ...pickInlineSnapshotFields(incomingSnapshot),
  };

  if (existing.userAddressId) {
    merged.userAddressId = String(existing.userAddressId);
  }

  return merged;
};

const patchAdminOrderAddressSnapshot = async (orderNo, body = {}, options = {}) => {
  const normalizedOrderNo = String(orderNo || "").trim().toUpperCase();

  if (!isValidOrderNoFormat(normalizedOrderNo)) {
    return {
      ok: false,
      code: ORDER_ADDRESS_ERROR.INVALID_ORDER_NO,
      message: "Invalid order number",
      errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
      statusCode: 400,
    };
  }

  if (!body.addressSnapshot || typeof body.addressSnapshot !== "object") {
    return {
      ok: false,
      code: ORDER_ADDRESS_ERROR.INVALID_ADDRESS,
      message: "Address is required",
      errors: [{ path: "addressSnapshot", msg: "Provide a valid shipping address." }],
      statusCode: 400,
    };
  }

  const order = await Order.findOne({ orderNo: normalizedOrderNo });
  if (!order) {
    return {
      ok: false,
      code: ORDER_ADDRESS_ERROR.NOT_FOUND,
      message: "Order not found",
      errors: [{ path: "orderNo", msg: "Order not found." }],
      statusCode: 404,
    };
  }

  if (order.status === STATUS.CANCELLED.value) {
    return {
      ok: false,
      code: ORDER_ADDRESS_ERROR.ORDER_CANCELLED,
      message: "Cannot edit address on a cancelled order",
      errors: [
        {
          path: "addressSnapshot",
          msg: "Shipping address cannot be changed after cancellation.",
        },
      ],
      statusCode: 400,
    };
  }

  const mergedInput = buildMergedSnapshotInput(order.addressSnapshot, body.addressSnapshot);
  const validated = validateAndNormalizeOrderAddressSnapshot(mergedInput);
  if (!validated.valid) {
    return {
      ok: false,
      code: ORDER_ADDRESS_ERROR.INVALID_ADDRESS,
      message: "Invalid shipping address",
      errors: validated.errors,
      statusCode: 400,
    };
  }

  const previousSnapshot = snapshotToPlain(order.addressSnapshot);
  if (snapshotsEqual(previousSnapshot, validated.snapshot)) {
    return {
      ok: false,
      code: ORDER_ADDRESS_ERROR.NO_CHANGES,
      message: "No address changes",
      errors: [{ path: "addressSnapshot", msg: "Address is unchanged." }],
      statusCode: 400,
    };
  }

  order.addressSnapshot = validated.snapshot;
  await order.save();

  await order.populate("userId", "name email phone");
  const items = await OrderItem.find({ orderId: order._id })
    .sort({ createdAt: 1 })
    .lean();

  return {
    ok: true,
    order: serializeAdminOrderDetail(order.toObject(), items),
  };
};

module.exports = {
  ORDER_ADDRESS_ERROR,
  patchAdminOrderAddressSnapshot,
  buildMergedSnapshotInput,
};
