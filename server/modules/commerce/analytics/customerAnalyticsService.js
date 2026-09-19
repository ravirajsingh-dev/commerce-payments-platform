const mongoose = require("mongoose");
const Order = require("../../../models/Order");
const User = require("../../../models/User");
const { GMV_EXCLUDED_STATUSES, roundMoney } = require("./variantSalesService");

const buildOrderStatusBreakdown = (rows = []) => {
  const breakdown = {
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };

  for (const row of rows) {
    if (row._id && breakdown[row._id] !== undefined) {
      breakdown[row._id] = row.count;
    }
  }

  return breakdown;
};

/**
 * Per-customer order analytics for admin user detail.
 * Spent and AOV use non-cancelled orders (aligned with sales dashboard GMV).
 */
const getCustomerOrderAnalytics = async (userId) => {
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

  const userObjectId = new mongoose.Types.ObjectId(normalizedUserId);
  const contributingMatch = {
    userId: userObjectId,
    status: { $nin: GMV_EXCLUDED_STATUSES },
  };

  const [spentRows, statusRows, dateRows, totalOrders] = await Promise.all([
    Order.aggregate([
      { $match: contributingMatch },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$amounts.total" },
        },
      },
    ]),
    Order.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: contributingMatch },
      {
        $group: {
          _id: null,
          firstOrderAt: { $min: "$createdAt" },
          lastOrderAt: { $max: "$createdAt" },
        },
      },
    ]),
    Order.countDocuments({ userId: userObjectId }),
  ]);

  const orderCount = Number(spentRows[0]?.orderCount) || 0;
  const totalSpent = roundMoney(spentRows[0]?.totalSpent);
  const aov = orderCount > 0 ? roundMoney(totalSpent / orderCount) : 0;
  const orderStatusBreakdown = buildOrderStatusBreakdown(statusRows);
  const cancelledOrders = orderStatusBreakdown.cancelled || 0;

  return {
    ok: true,
    analytics: {
      userId: normalizedUserId,
      orderCount,
      totalSpent,
      aov,
      totalOrders,
      cancelledOrders,
      firstOrderAt: dateRows[0]?.firstOrderAt || null,
      lastOrderAt: dateRows[0]?.lastOrderAt || null,
      orderStatusBreakdown,
      spentDefinition:
        "Sum of order totals excluding cancelled orders (all time).",
    },
  };
};

module.exports = {
  getCustomerOrderAnalytics,
};
