const Order = require("../../../models/Order");
const User = require("../../../models/User");
const {
  GMV_EXCLUDED_STATUSES,
  roundMoney,
  listTopVariantSales,
} = require("./variantSalesService");
const {
  parseAnalyticsDateRange,
  normalizePeriod,
  periodDateFormat,
} = require("./analyticsDateHelpers");

const { STATUS_VALUES } = require("../../../shared/constants/order");

const buildOrderStatusBreakdown = (rows = []) => {
  const breakdown = Object.fromEntries(STATUS_VALUES.map((status) => [status, 0]));

  for (const row of rows) {
    if (row._id && Object.hasOwn(breakdown, row._id)) {
      breakdown[row._id] = row.count;
    }
  }

  return breakdown;
};

const serializeTopSku = (row, rank) => ({
  rank,
  variantId: String(row._id),
  sku: row.sku || "",
  productName: row.productName || "",
  productSlug: row.productSlug || "",
  unitsSold: Number(row.unitsSold) || 0,
  revenue: roundMoney(row.revenue),
});

const serializeTopCustomer = (row, rank, user) => ({
  rank,
  userId: String(row._id),
  name: user?.name || "",
  email: user?.email || "",
  phone: user?.phone || "",
  orderCount: Number(row.orderCount) || 0,
  totalSpent: roundMoney(row.totalSpent),
});

const buildGmvMatch = (createdAtFilter = {}) => ({
  status: { $nin: GMV_EXCLUDED_STATUSES },
  ...createdAtFilter,
});

const getSalesDashboardSummary = async (query = {}) => {
  const dateRange = parseAnalyticsDateRange(query);
  if (!dateRange.ok) {
    return {
      ok: false,
      errors: dateRange.errors,
      message: "Invalid date range.",
      statusCode: 400,
    };
  }

  const topLimit = Math.min(Math.max(Number(query.topLimit) || 10, 1), 50);
  const topCustomersLimit = Math.min(
    Math.max(Number(query.topCustomersLimit) || 10, 1),
    50,
  );
  const period = normalizePeriod(query.period);
  const gmvMatch = buildGmvMatch(dateRange.createdAtFilter);
  const statusMatch = dateRange.createdAtFilter;

  const [gmvRows, statusRows, topSkuRows, totalOrders, gmvByPeriodRows, topCustomerRows] =
    await Promise.all([
      Order.aggregate([
        { $match: gmvMatch },
        {
          $group: {
            _id: null,
            gmv: { $sum: "$amounts.total" },
            orderCount: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: statusMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      listTopVariantSales(topLimit, dateRange.createdAtFilter),
      Order.countDocuments(statusMatch),
      Order.aggregate([
        { $match: gmvMatch },
        {
          $group: {
            _id: {
              $dateToString: {
                format: periodDateFormat(period),
                date: "$createdAt",
                timezone: "UTC",
              },
            },
            gmv: { $sum: "$amounts.total" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: gmvMatch },
        {
          $group: {
            _id: "$userId",
            orderCount: { $sum: 1 },
            totalSpent: { $sum: "$amounts.total" },
          },
        },
        { $sort: { totalSpent: -1, orderCount: -1 } },
        { $limit: topCustomersLimit },
      ]),
    ]);

  const gmv = roundMoney(gmvRows[0]?.gmv);
  const orderCount = Number(gmvRows[0]?.orderCount) || 0;
  const aov = orderCount > 0 ? roundMoney(gmv / orderCount) : 0;
  const orderStatusBreakdown = buildOrderStatusBreakdown(statusRows);
  const cancelledOrders = orderStatusBreakdown.cancelled || 0;

  const customerIds = topCustomerRows.map((row) => row._id);
  const users = customerIds.length
    ? await User.find({ _id: { $in: customerIds } })
        .select("name email phone")
        .lean()
    : [];
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const hasDateRange = Boolean(dateRange.fromDate || dateRange.toDate);

  return {
    ok: true,
    dashboard: {
      gmv,
      aov,
      orderCount,
      totalOrders,
      cancelledOrders,
      orderStatusBreakdown,
      topSkus: topSkuRows.map((row, index) => serializeTopSku(row, index + 1)),
      topCustomers: topCustomerRows.map((row, index) =>
        serializeTopCustomer(row, index + 1, userMap.get(String(row._id))),
      ),
      gmvByPeriod: gmvByPeriodRows.map((row) => ({
        period: row._id,
        gmv: roundMoney(row.gmv),
        orderCount: Number(row.orderCount) || 0,
      })),
      topLimit,
      topCustomersLimit,
      period,
      dateRange: {
        fromDate: dateRange.fromDate
          ? dateRange.fromDate.toISOString().slice(0, 10)
          : null,
        toDate: dateRange.toDate
          ? dateRange.toDate.toISOString().slice(0, 10)
          : null,
      },
      gmvDefinition: hasDateRange
        ? "Sum of order grand totals excluding cancelled orders in the selected date range."
        : "Sum of order grand totals excluding cancelled orders (all time).",
      generatedAt: new Date().toISOString(),
    },
  };
};

module.exports = {
  GMV_EXCLUDED_STATUSES,
  getSalesDashboardSummary,
};
