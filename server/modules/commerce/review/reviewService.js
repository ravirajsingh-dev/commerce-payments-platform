const mongoose = require("mongoose");
const Review = require("../../../models/Review");
const Order = require("../../../models/Order");
const OrderItem = require("../../../models/OrderItem");
const { isValidOrderNoFormat } = require("../order/orderNumberGenerator");
const { STATUS } = require("../../../shared/constants/order");
const ProductVariant = require("../../../models/ProductVariant");
const Product = require("../../../models/Product");
const Attribute = require("../../../models/Attribute");
const User = require("../../../models/User");

const REVIEW_ERROR = {
  INVALID_VARIANT: "INVALID_VARIANT",
  NOT_PURCHASED: "NOT_PURCHASED",
  DUPLICATE: "DUPLICATE_REVIEW",
  NOT_FOUND: "REVIEW_NOT_FOUND",
  INVALID_RATING: "INVALID_RATING",
};

const { REVIEW_ELIGIBLE_ORDER_STATUSES } = require("../../../shared/constants/order");

const ELIGIBLE_ORDER_STATUSES = [...REVIEW_ELIGIBLE_ORDER_STATUSES];

const parsePagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

const toObjectId = (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
};

const SIZE_ATTRIBUTE_CODES = new Set(["size", "sizes"]);

const attributesToObject = (attrs) => {
  if (!attrs) return {};
  if (attrs instanceof Map) {
    return Object.fromEntries(attrs);
  }
  if (typeof attrs === "object") {
    return { ...attrs };
  }
  return {};
};

const humanizeAttributeValue = (raw) => {
  const text = String(raw || "")
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
  if (!text) return "";
  return text
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      if (/^[A-Z0-9]{1,4}$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
};

const buildAttributeLabelMap = (definitions = []) => {
  const map = new Map();
  for (const def of definitions) {
    const code = String(def?.code || "").toLowerCase();
    if (!code) continue;
    const optionMap = new Map();
    for (const option of def?.options || []) {
      optionMap.set(
        String(option?.value || "").toLowerCase(),
        option?.label || option?.value || "",
      );
    }
    map.set(code, {
      name: def?.name || code,
      optionMap,
    });
  }
  return map;
};

const formatReviewerFullName = (user) => {
  const name = String(user?.name || "").trim();
  return name || "Customer";
};

const formatPurchaseForLine = (orderItem, attributeDefinitions = []) => {
  if (!orderItem) return "";
  const labelMap = buildAttributeLabelMap(attributeDefinitions);
  const snapshot = attributesToObject(orderItem.attributesSnapshot);
  const parts = [];

  for (const def of attributeDefinitions) {
    const code = String(def?.code || "").trim().toLowerCase();
    if (!code || SIZE_ATTRIBUTE_CODES.has(code)) continue;
    const raw =
      snapshot[code] ??
      snapshot[def.code] ??
      snapshot[String(def.code || "").trim()];
    const value = String(raw || "").trim();
    if (!value) continue;
    const meta = labelMap.get(code);
    const valueLabel =
      meta?.optionMap?.get(value.toLowerCase()) || humanizeAttributeValue(value);
    const attrName = String(meta?.name || def?.name || code).trim();
    parts.push(`${attrName}: ${valueLabel}`);
  }

  for (const [code, raw] of Object.entries(snapshot)) {
    const normalized = String(code).trim().toLowerCase();
    if (SIZE_ATTRIBUTE_CODES.has(normalized)) continue;
    if (labelMap.has(normalized)) continue;
    const value = String(raw || "").trim();
    if (!value) continue;
    parts.push(`${humanizeAttributeValue(code)}: ${humanizeAttributeValue(value)}`);
  }

  const size = String(orderItem.size || "").trim();
  if (size) {
    parts.push(`Size: ${size.toUpperCase()}`);
  }

  return parts.join(" · ");
};

const loadVariantAttributeDefinitions = async (variantObjectId) => {
  const variant = await ProductVariant.findById(variantObjectId)
    .select("productId")
    .lean();
  if (!variant?.productId) return [];
  const product = await Product.findById(variant.productId)
    .select("attributeSetId")
    .lean();
  if (!product?.attributeSetId) return [];
  const definitions = await Attribute.find({
    attributeSetId: product.attributeSetId,
    isActive: true,
  })
    .select("name code options")
    .sort({ name: 1 })
    .lean();
  return definitions || [];
};

const loadLatestOrderItemsByUserIds = async (userIds, variantObjectId) => {
  const userObjectIds = userIds.map(toObjectId).filter(Boolean);
  if (!userObjectIds.length) return new Map();

  const orders = await Order.find({
    userId: { $in: userObjectIds },
    status: { $in: ELIGIBLE_ORDER_STATUSES },
  })
    .select("_id userId createdAt")
    .sort({ createdAt: -1 })
    .lean();

  if (!orders.length) return new Map();

  const orderIds = orders.map((row) => row._id);
  const orderUserMap = new Map(
    orders.map((row) => [String(row._id), String(row.userId)]),
  );
  const orderDateMap = new Map(
    orders.map((row) => [String(row._id), row.createdAt]),
  );

  const items = await OrderItem.find({
    orderId: { $in: orderIds },
    productVariantId: variantObjectId,
  }).lean();

  const latestByUser = new Map();
  for (const item of items) {
    const userId = orderUserMap.get(String(item.orderId));
    if (!userId) continue;
    const orderDate = orderDateMap.get(String(item.orderId));
    const existing = latestByUser.get(userId);
    if (!existing || orderDate > existing.orderDate) {
      latestByUser.set(userId, { item, orderDate });
    }
  }

  return new Map(
    [...latestByUser.entries()].map(([userId, payload]) => [
      userId,
      payload.item,
    ]),
  );
};

const serializePublicReview = (
  row,
  { userById = new Map(), orderItemByUserId = new Map(), attributeDefinitions = [] } = {},
) => {
  const doc = row.toObject ? row.toObject() : row;
  const userId = String(doc.userId);
  const user = userById.get(userId);
  const orderItem = orderItemByUserId.get(userId);
  return {
    _id: String(doc._id),
    rating: doc.rating,
    title: doc.title || "",
    comment: doc.comment || "",
    reviewerName: formatReviewerFullName(user),
    purchaseFor: formatPurchaseForLine(orderItem, attributeDefinitions),
    createdAt: doc.createdAt,
  };
};

const serializeUserReview = (
  row,
  { user = null, orderItem = null, attributeDefinitions = [] } = {},
) => {
  if (!row) return null;
  const doc = row.toObject ? row.toObject() : row;
  return {
    _id: String(doc._id),
    rating: doc.rating,
    title: doc.title || "",
    comment: doc.comment || "",
    status: doc.status,
    reviewerName: formatReviewerFullName(user),
    purchaseFor: formatPurchaseForLine(orderItem, attributeDefinitions),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

const loadUsersByIds = async (userIds) => {
  if (!userIds.length) return new Map();
  const users = await User.find({ _id: { $in: userIds } })
    .select("name")
    .lean();
  return new Map(users.map((u) => [String(u._id), u]));
};

const userHasPurchasedVariant = async (userId, productVariantId) => {
  const userObjectId = toObjectId(userId);
  const variantObjectId = toObjectId(productVariantId);
  if (!userObjectId || !variantObjectId) return false;

  const orderIds = await Order.distinct("_id", {
    userId: userObjectId,
    status: { $in: ELIGIBLE_ORDER_STATUSES },
  });
  if (!orderIds.length) return false;

  const item = await OrderItem.findOne({
    orderId: { $in: orderIds },
    productVariantId: variantObjectId,
  })
    .select("_id")
    .lean();

  return Boolean(item);
};

const EMPTY_RATING_DISTRIBUTION = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

const buildRatingDistribution = (rows = []) => {
  const distribution = { ...EMPTY_RATING_DISTRIBUTION };
  for (const row of rows) {
    const star = Number(row._id);
    if (star >= 1 && star <= 5) {
      distribution[star] = row.count || 0;
    }
  }
  return distribution;
};

const REVIEW_SORT_OPTIONS = {
  latest: { createdAt: -1 },
  positive: { rating: -1, createdAt: -1 },
  negative: { rating: 1, createdAt: -1 },
  helpful: { rating: -1, createdAt: -1 },
};

const resolveReviewSort = (sort) =>
  REVIEW_SORT_OPTIONS[sort] ? sort : "latest";

const getApprovedReviewSummary = async (productVariantId) => {
  const variantObjectId = toObjectId(productVariantId);
  if (!variantObjectId) {
    return {
      averageRating: 0,
      reviewCount: 0,
      ratingDistribution: { ...EMPTY_RATING_DISTRIBUTION },
    };
  }

  const [facet] = await Review.aggregate([
    { $match: { productVariantId: variantObjectId, status: "approved" } },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              reviewCount: { $sum: 1 },
              averageRating: { $avg: "$rating" },
            },
          },
        ],
        distribution: [{ $group: { _id: "$rating", count: { $sum: 1 } } }],
      },
    },
  ]);

  const summary = facet?.summary?.[0];
  if (!summary) {
    return {
      averageRating: 0,
      reviewCount: 0,
      ratingDistribution: { ...EMPTY_RATING_DISTRIBUTION },
    };
  }

  return {
    averageRating: Math.round((summary.averageRating || 0) * 10) / 10,
    reviewCount: summary.reviewCount || 0,
    ratingDistribution: buildRatingDistribution(facet?.distribution || []),
  };
};

const listApprovedReviewsForVariant = async (productVariantId, query = {}) => {
  const variantObjectId = toObjectId(productVariantId);
  if (!variantObjectId) {
    return {
      ok: false,
      code: REVIEW_ERROR.INVALID_VARIANT,
      message: "Invalid product variant.",
      statusCode: 400,
    };
  }

  const variant = await ProductVariant.findById(variantObjectId).select("_id status").lean();
  if (!variant || variant.status !== 1) {
    return {
      ok: false,
      code: REVIEW_ERROR.INVALID_VARIANT,
      message: "Product variant not found.",
      statusCode: 404,
    };
  }

  const { page, limit, skip } = parsePagination(query);
  const sortKey = resolveReviewSort(query.sort);
  const filter = { productVariantId: variantObjectId, status: "approved" };

  const [reviews, total, summary] = await Promise.all([
    Review.find(filter)
      .sort(REVIEW_SORT_OPTIONS[sortKey])
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
    getApprovedReviewSummary(productVariantId),
  ]);

  const userIds = [...new Set(reviews.map((r) => String(r.userId)))];
  const [userById, orderItemByUserId, attributeDefinitions] = await Promise.all([
    loadUsersByIds(userIds),
    loadLatestOrderItemsByUserIds(userIds, variantObjectId),
    loadVariantAttributeDefinitions(variantObjectId),
  ]);

  const serializeCtx = { userById, orderItemByUserId, attributeDefinitions };

  return {
    ok: true,
    reviews: reviews.map((row) => serializePublicReview(row, serializeCtx)),
    summary,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const getUserReviewContext = async (userId, productVariantId) => {
  const variantObjectId = toObjectId(productVariantId);
  if (!variantObjectId) {
    return {
      ok: false,
      code: REVIEW_ERROR.INVALID_VARIANT,
      message: "Invalid product variant.",
      statusCode: 400,
    };
  }

  const [canReview, review, attributeDefinitions] = await Promise.all([
    userId ? userHasPurchasedVariant(userId, productVariantId) : Promise.resolve(false),
    userId
      ? Review.findOne({
          productVariantId: variantObjectId,
          userId: toObjectId(userId),
        }).lean()
      : Promise.resolve(null),
    loadVariantAttributeDefinitions(variantObjectId),
  ]);

  let user = null;
  let orderItem = null;
  if (userId) {
    const userObjectId = toObjectId(userId);
    const [userRow, orderItemMap] = await Promise.all([
      User.findById(userObjectId).select("name").lean(),
      loadLatestOrderItemsByUserIds([userId], variantObjectId),
    ]);
    user = userRow;
    orderItem = orderItemMap.get(String(userId)) || null;
  }

  return {
    ok: true,
    canReview: Boolean(userId && canReview),
    review: serializeUserReview(review, { user, orderItem, attributeDefinitions }),
  };
};

const submitReview = async (userId, payload = {}) => {
  const userObjectId = toObjectId(userId);
  const variantObjectId = toObjectId(payload.productVariantId);
  const rating = Number(payload.rating);

  if (!userObjectId) {
    return {
      ok: false,
      message: "Authentication required.",
      statusCode: 401,
    };
  }

  if (!variantObjectId) {
    return {
      ok: false,
      code: REVIEW_ERROR.INVALID_VARIANT,
      errors: [{ path: "productVariantId", msg: "Valid product variant is required." }],
      statusCode: 400,
    };
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return {
      ok: false,
      code: REVIEW_ERROR.INVALID_RATING,
      errors: [{ path: "rating", msg: "Rating must be between 1 and 5." }],
      statusCode: 400,
    };
  }

  const variant = await ProductVariant.findById(variantObjectId)
    .select("_id productId status")
    .lean();
  if (!variant || variant.status !== 1) {
    return {
      ok: false,
      code: REVIEW_ERROR.INVALID_VARIANT,
      errors: [{ path: "productVariantId", msg: "Product variant not found." }],
      statusCode: 404,
    };
  }

  const purchased = await userHasPurchasedVariant(userId, payload.productVariantId);
  if (!purchased) {
    return {
      ok: false,
      code: REVIEW_ERROR.NOT_PURCHASED,
      message: "You can review items after your order is delivered.",
      statusCode: 403,
    };
  }

  const existing = await Review.findOne({
    productVariantId: variantObjectId,
    userId: userObjectId,
  }).lean();

  if (existing) {
    return {
      ok: false,
      code: REVIEW_ERROR.DUPLICATE,
      message: "You have already submitted a review for this product.",
      statusCode: 409,
    };
  }

  const title = String(payload.title || "").trim().slice(0, 150);
  const comment = String(payload.comment || "").trim().slice(0, 1500);

  const [doc, attributeDefinitions, user, orderItemMap] = await Promise.all([
    Review.create({
      productId: variant.productId,
      productVariantId: variantObjectId,
      userId: userObjectId,
      rating,
      title,
      comment,
      status: "pending",
    }),
    loadVariantAttributeDefinitions(variantObjectId),
    User.findById(userObjectId).select("name").lean(),
    loadLatestOrderItemsByUserIds([String(userObjectId)], variantObjectId),
  ]);

  const orderItem = orderItemMap.get(String(userObjectId)) || null;

  return {
    ok: true,
    review: serializeUserReview(doc, {
      user,
      orderItem,
      attributeDefinitions,
    }),
    message: "Thank you! Your review is pending approval.",
  };
};

const ORDER_REVIEW_ERROR = {
  INVALID_ORDER_NO: "INVALID_ORDER_NO",
  NOT_FOUND: "ORDER_NOT_FOUND",
};

const loadUserOrderItemsForReview = async (userId, orderNo) => {
  const normalizedOrderNo = String(orderNo || "").trim().toUpperCase();
  if (!isValidOrderNoFormat(normalizedOrderNo)) {
    return {
      ok: false,
      code: ORDER_REVIEW_ERROR.INVALID_ORDER_NO,
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
      code: ORDER_REVIEW_ERROR.NOT_FOUND,
      message: "Order not found",
      errors: [{ path: "orderNo", msg: "Order not found." }],
      statusCode: 404,
    };
  }

  const items = await OrderItem.find({ orderId: order._id })
    .sort({ createdAt: 1 })
    .lean();

  return {
    ok: true,
    order: {
      status: order.status,
      items: items.map((row) => ({
        variantId: String(row.productVariantId),
        productNameSnapshot: row.productNameSnapshot,
        size: row.size,
        skuSnapshot: row.skuSnapshot,
        attributesSnapshot: attributesToObject(row.attributesSnapshot),
      })),
    },
  };
};

const getOrderReviewContext = async (userId, orderNo) => {
  const orderResult = await loadUserOrderItemsForReview(userId, orderNo);
  if (!orderResult.ok) {
    return orderResult;
  }

  const order = orderResult.order;
  const isDelivered = order.status === STATUS.DELIVERED.value;

  if (!isDelivered) {
    return {
      ok: true,
      canReviewOrder: false,
      items: [],
    };
  }

  const seenVariants = new Set();
  const reviewLines = [];
  for (const item of order.items || []) {
    const variantId = String(item.variantId || "");
    if (!variantId || seenVariants.has(variantId)) continue;
    seenVariants.add(variantId);
    reviewLines.push(item);
  }

  if (!reviewLines.length) {
    return {
      ok: true,
      canReviewOrder: false,
      items: [],
    };
  }

  const variantObjectIds = reviewLines
    .map((row) => toObjectId(row.variantId))
    .filter(Boolean);
  const userObjectId = toObjectId(userId);

  const [reviews, user, attributeDefinitionsByVariant] = await Promise.all([
    Review.find({
      userId: userObjectId,
      productVariantId: { $in: variantObjectIds },
    }).lean(),
    User.findById(userObjectId).select("name").lean(),
    Promise.all(
      variantObjectIds.map(async (variantObjectId) => ({
        variantId: String(variantObjectId),
        definitions: await loadVariantAttributeDefinitions(variantObjectId),
      })),
    ),
  ]);

  const reviewByVariant = new Map(
    reviews.map((row) => [String(row.productVariantId), row]),
  );
  const definitionsByVariant = new Map(
    attributeDefinitionsByVariant.map((row) => [row.variantId, row.definitions]),
  );

  const items = reviewLines.map((line) => {
    const variantId = String(line.variantId);
    const review = reviewByVariant.get(variantId) || null;
    const attributeDefinitions = definitionsByVariant.get(variantId) || [];
    return {
      variantId,
      productName: line.productNameSnapshot || "",
      size: line.size || "",
      skuSnapshot: line.skuSnapshot || "",
      purchaseFor: formatPurchaseForLine(
        {
          size: line.size,
          attributesSnapshot: line.attributesSnapshot,
        },
        attributeDefinitions,
      ),
      canReview: !review,
      review: serializeUserReview(review, {
        user,
        orderItem: line,
        attributeDefinitions,
      }),
    };
  });

  return {
    ok: true,
    canReviewOrder: items.some((row) => row.canReview),
    items,
  };
};

module.exports = {
  REVIEW_ERROR,
  ELIGIBLE_ORDER_STATUSES,
  listApprovedReviewsForVariant,
  getUserReviewContext,
  getOrderReviewContext,
  submitReview,
  userHasPurchasedVariant,
  getApprovedReviewSummary,
  serializePublicReview,
  serializeUserReview,
  formatReviewerFullName,
  formatPurchaseForLine,
};
