const mongoose = require("mongoose");
const Review = require("../../../models/Review");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const User = require("../../../models/User");

const REVIEW_ADMIN_ERROR = {
  INVALID_ID: "INVALID_REVIEW_ID",
  NOT_FOUND: "REVIEW_NOT_FOUND",
  INVALID_STATUS: "INVALID_STATUS",
  NO_UPDATES: "NO_UPDATES",
};

const REVIEW_STATUSES = new Set(["pending", "approved", "rejected"]);

const parsePagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const toObjectId = (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
};

const buildListFilter = (query = {}) => {
  const filter = {};

  const status = String(query.status || "").trim().toLowerCase();
  if (status) {
    if (!REVIEW_STATUSES.has(status)) {
      return { error: REVIEW_ADMIN_ERROR.INVALID_STATUS };
    }
    filter.status = status;
  }

  const productVariantId = toObjectId(query.productVariantId);
  if (query.productVariantId) {
    if (!productVariantId) {
      return { error: REVIEW_ADMIN_ERROR.INVALID_ID };
    }
    filter.productVariantId = productVariantId;
  }

  const productId = toObjectId(query.productId);
  if (query.productId) {
    if (!productId) {
      return { error: REVIEW_ADMIN_ERROR.INVALID_ID };
    }
    filter.productId = productId;
  }

  const rating = parseInt(query.rating, 10);
  if (query.rating !== undefined && query.rating !== "") {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return { error: REVIEW_ADMIN_ERROR.INVALID_STATUS };
    }
    filter.rating = rating;
  }

  return { filter, productName: String(query.productName || "").trim(), userName: String(query.userName || "").trim() };
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const applyTextFilters = async (filter, { productName, userName }) => {
  if (productName) {
    const products = await Product.find({
      name: new RegExp(escapeRegex(productName), "i"),
    })
      .select("_id")
      .lean();
    const productIds = products.map((row) => row._id);
    filter.productId = { $in: productIds.length ? productIds : [null] };
  }

  if (userName) {
    const users = await User.find({
      name: new RegExp(escapeRegex(userName), "i"),
    })
      .select("_id")
      .lean();
    const userIds = users.map((row) => row._id);
    filter.userId = { $in: userIds.length ? userIds : [null] };
  }

  return filter;
};

const buildStatusSummary = async (filter) => {
  const rows = await Review.aggregate([
    { $match: filter },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const summary = { pending: 0, approved: 0, rejected: 0 };
  for (const row of rows) {
    if (summary[row._id] !== undefined) {
      summary[row._id] = row.count;
    }
  }
  return summary;
};

const serializeAdminReview = (row, context = {}) => {
  const doc = row.toObject ? row.toObject() : row;
  const user = context.userById?.get(String(doc.userId));
  const variant = context.variantById?.get(String(doc.productVariantId));
  const product = context.productById?.get(String(doc.productId));

  return {
    _id: String(doc._id),
    productId: String(doc.productId),
    productVariantId: String(doc.productVariantId),
    productName: product?.name || "",
    productSlug: product?.slug || "",
    variantSku: variant?.sku || "",
    variantName: variant?.name || "",
    userId: String(doc.userId),
    userName: user?.name || "",
    userEmail: user?.email || "",
    rating: doc.rating,
    title: doc.title || "",
    comment: doc.comment || "",
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

const loadReviewContext = async (reviews) => {
  const userIds = [...new Set(reviews.map((r) => String(r.userId)))];
  const variantIds = [...new Set(reviews.map((r) => String(r.productVariantId)))];
  const productIds = [...new Set(reviews.map((r) => String(r.productId)))];

  const [users, variants, products] = await Promise.all([
    User.find({ _id: { $in: userIds } })
      .select("name email")
      .lean(),
    ProductVariant.find({ _id: { $in: variantIds } })
      .select("sku name productId")
      .lean(),
    Product.find({ _id: { $in: productIds } })
      .select("name slug")
      .lean(),
  ]);

  return {
    userById: new Map(users.map((u) => [String(u._id), u])),
    variantById: new Map(variants.map((v) => [String(v._id), v])),
    productById: new Map(products.map((p) => [String(p._id), p])),
  };
};

const listAdminReviews = async (query = {}) => {
  const filterResult = buildListFilter(query);
  if (filterResult.error) {
    return {
      ok: false,
      code: filterResult.error,
      message: "Invalid filter parameters.",
      statusCode: 400,
    };
  }

  const { filter: baseFilter, productName, userName } = filterResult;
  const filter = await applyTextFilters({ ...baseFilter }, { productName, userName });
  const { page, limit, skip } = parsePagination(query);
  const orderBy = String(query.orderBy || "createdAt");
  const ascending = String(query.ascending || "desc").toLowerCase() === "asc" ? 1 : -1;
  const sort = { [["createdAt", "rating", "status"].includes(orderBy) ? orderBy : "createdAt"]: ascending };

  const [reviews, total, summary] = await Promise.all([
    Review.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Review.countDocuments(filter),
    buildStatusSummary(filter),
  ]);

  const context = await loadReviewContext(reviews);

  return {
    ok: true,
    reviews: reviews.map((row) => serializeAdminReview(row, context)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    summary,
  };
};

const getAdminReviewById = async (reviewId) => {
  const reviewObjectId = toObjectId(reviewId);
  if (!reviewObjectId) {
    return {
      ok: false,
      code: REVIEW_ADMIN_ERROR.INVALID_ID,
      message: "Invalid review id.",
      statusCode: 400,
    };
  }

  const review = await Review.findById(reviewObjectId).lean();
  if (!review) {
    return {
      ok: false,
      code: REVIEW_ADMIN_ERROR.NOT_FOUND,
      message: "Review not found.",
      statusCode: 404,
    };
  }

  const context = await loadReviewContext([review]);

  return {
    ok: true,
    review: serializeAdminReview(review, context),
  };
};

const setAdminReviewStatus = async (reviewId, status) => {
  const reviewObjectId = toObjectId(reviewId);
  const normalizedStatus = String(status || "").trim().toLowerCase();

  if (!reviewObjectId) {
    return {
      ok: false,
      code: REVIEW_ADMIN_ERROR.INVALID_ID,
      message: "Invalid review id.",
      statusCode: 400,
    };
  }

  if (!REVIEW_STATUSES.has(normalizedStatus) || normalizedStatus === "pending") {
    return {
      ok: false,
      code: REVIEW_ADMIN_ERROR.INVALID_STATUS,
      errors: [{ path: "status", msg: "Status must be approved or rejected." }],
      statusCode: 400,
    };
  }

  const review = await Review.findById(reviewObjectId);
  if (!review) {
    return {
      ok: false,
      code: REVIEW_ADMIN_ERROR.NOT_FOUND,
      message: "Review not found.",
      statusCode: 404,
    };
  }

  if (review.status === normalizedStatus) {
    return {
      ok: false,
      code: REVIEW_ADMIN_ERROR.NO_UPDATES,
      message: "Review already has this status.",
      statusCode: 400,
    };
  }

  review.status = normalizedStatus;
  await review.save();

  const context = await loadReviewContext([review.toObject()]);

  return {
    ok: true,
    review: serializeAdminReview(review.toObject(), context),
    message: normalizedStatus === "approved" ? "Review approved." : "Review rejected.",
  };
};

const deleteAdminReview = async (reviewId) => {
  const reviewObjectId = toObjectId(reviewId);
  if (!reviewObjectId) {
    return {
      ok: false,
      code: REVIEW_ADMIN_ERROR.INVALID_ID,
      message: "Invalid review id.",
      statusCode: 400,
    };
  }

  const review = await Review.findById(reviewObjectId);
  if (!review) {
    return {
      ok: false,
      code: REVIEW_ADMIN_ERROR.NOT_FOUND,
      message: "Review not found.",
      statusCode: 404,
    };
  }

  await Review.deleteOne({ _id: review._id });

  return {
    ok: true,
    message: "Review deleted.",
  };
};

const bulkDeleteAdminReviews = async (reviewIds = []) => {
  const ids = [...new Set((Array.isArray(reviewIds) ? reviewIds : []).map(String))];
  if (!ids.length) {
    return {
      ok: false,
      code: REVIEW_ADMIN_ERROR.INVALID_ID,
      message: "Select at least one review.",
      statusCode: 400,
    };
  }

  const objectIds = ids.map(toObjectId).filter(Boolean);
  if (objectIds.length !== ids.length) {
    return {
      ok: false,
      code: REVIEW_ADMIN_ERROR.INVALID_ID,
      message: "One or more review ids are invalid.",
      statusCode: 400,
    };
  }

  const result = await Review.deleteMany({ _id: { $in: objectIds } });

  return {
    ok: true,
    deletedCount: result.deletedCount || 0,
    message:
      result.deletedCount === 1
        ? "1 review deleted."
        : `${result.deletedCount || 0} reviews deleted.`,
  };
};

module.exports = {
  REVIEW_ADMIN_ERROR,
  listAdminReviews,
  getAdminReviewById,
  setAdminReviewStatus,
  deleteAdminReview,
  bulkDeleteAdminReviews,
  serializeAdminReview,
};
