const OrderItem = require("../../../models/OrderItem");

/** Order statuses excluded from sales-based metrics (matches sales dashboard). */
const { GMV_EXCLUDED_ORDER_STATUSES } = require("../../../shared/constants/order");

const GMV_EXCLUDED_STATUSES = [...GMV_EXCLUDED_ORDER_STATUSES];

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const variantSalesAggregationPipeline = (orderExtraMatch = {}) => [
  {
    $lookup: {
      from: "orders",
      localField: "orderId",
      foreignField: "_id",
      as: "order",
    },
  },
  { $unwind: "$order" },
  {
    $match: {
      "order.status": { $nin: GMV_EXCLUDED_STATUSES },
      ...orderExtraMatch,
    },
  },
  {
    $group: {
      _id: "$productVariantId",
      sku: { $first: "$skuSnapshot" },
      productName: { $first: "$productNameSnapshot" },
      productSlug: { $first: "$productSlugSnapshot" },
      unitsSold: { $sum: "$quantity" },
      revenue: { $sum: "$lineTotal" },
    },
  },
];

/**
 * Returns a Map of variantId -> { unitsSold, revenue } from non-cancelled order lines.
 */
const buildOrderExtraMatchFromCreatedAt = (createdAtFilter = {}) => {
  if (!createdAtFilter?.createdAt) return {};
  return { "order.createdAt": createdAtFilter.createdAt };
};

const buildVariantSalesMap = async (createdAtFilter = {}) => {
  const rows = await OrderItem.aggregate(
    variantSalesAggregationPipeline(
      buildOrderExtraMatchFromCreatedAt(createdAtFilter),
    ),
  );
  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), {
      unitsSold: Number(row.unitsSold) || 0,
      revenue: roundMoney(row.revenue),
    });
  }
  return map;
};

const getVariantSalesStats = (variantId, salesMap) => {
  if (!salesMap) {
    return { unitsSold: 0, revenue: 0 };
  }
  return (
    salesMap.get(String(variantId)) || {
      unitsSold: 0,
      revenue: 0,
    }
  );
};

/**
 * Sort comparator for storefront variants (revenue desc, units desc, then title).
 */
const compareVariantsByBestSelling = (variantA, variantB, salesMap, titleFn) => {
  const salesA = getVariantSalesStats(variantA?._id, salesMap);
  const salesB = getVariantSalesStats(variantB?._id, salesMap);

  if (salesB.revenue !== salesA.revenue) {
    return salesB.revenue - salesA.revenue;
  }
  if (salesB.unitsSold !== salesA.unitsSold) {
    return salesB.unitsSold - salesA.unitsSold;
  }

  const titleA = titleFn(variantA);
  const titleB = titleFn(variantB);
  return titleA.localeCompare(titleB, undefined, { sensitivity: "base" });
};

const listTopVariantSales = async (limit = 10, createdAtFilter = {}) => {
  const topLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  return OrderItem.aggregate([
    ...variantSalesAggregationPipeline(
      buildOrderExtraMatchFromCreatedAt(createdAtFilter),
    ),
    { $sort: { revenue: -1, unitsSold: -1 } },
    { $limit: topLimit },
  ]);
};

module.exports = {
  GMV_EXCLUDED_STATUSES,
  roundMoney,
  buildVariantSalesMap,
  getVariantSalesStats,
  compareVariantsByBestSelling,
  listTopVariantSales,
};
