const mongoose = require("mongoose");
const Order = require("../../../../models/Order");
const OrderItem = require("../../../../models/OrderItem");
const User = require("../../../../models/User");
const CommonSettings = require("../../../../models/CommonSettings");
const { isValidOrderNoFormat } = require("../orderNumberGenerator");

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

/**
 * Loads order, line items, settings, and customer for on-demand invoice PDF generation.
 */
const loadInvoiceContext = async (userId, orderNo) => {
  const normalizedOrderNo = String(orderNo || "").trim().toUpperCase();

  if (!isValidOrderNoFormat(normalizedOrderNo)) {
    return { ok: false, code: "INVALID_ORDER_NO" };
  }

  const order = await Order.findOne({
    userId: toObjectId(userId),
    orderNo: normalizedOrderNo,
  }).lean();

  if (!order) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const [items, settings, customer] = await Promise.all([
    OrderItem.find({ orderId: order._id }).sort({ createdAt: 1 }).lean(),
    CommonSettings.getOrCreateSettings(),
    User.findById(order.userId).select("name email phone").lean(),
  ]);

  return {
    ok: true,
    order,
    items,
    settings: settings?.toObject ? settings.toObject() : settings,
    customer,
  };
};

module.exports = {
  loadInvoiceContext,
};
