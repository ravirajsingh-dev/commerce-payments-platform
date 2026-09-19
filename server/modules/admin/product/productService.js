const { DEFAULT_PAGE_SIZE } = require("../../../config/constants");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const { processSearchFilters } = require("../adminSearchHelper");
const { generateSlug } = require("../../../shared/utils/generateSlug");
const {
  validateAndNormalizeListFilters,
} = require("../../../shared/middleware/validateRequest");
const {
  normalizeSizeChart,
  sizeChartToPlain,
} = require("./productSizeChartHelpers");

const toIdString = (value) => String(value || "").trim();

const buildListInput = (req) => {
  const {
    limit = DEFAULT_PAGE_SIZE,
    page = 1,
    orderBy = "createdAt",
    ascending = "desc",
  } = req.query || req.body;

  let filters = [];
  let query = {};

  if (req.query.limit) {
    if (typeof req.query.filters === "string") {
      filters = req.query.filters.split(",");
    } else if (Array.isArray(req.query.filters)) {
      filters = req.query.filters;
    }

    if (typeof req.query.query === "string") {
      try {
        query = JSON.parse(req.query.query);
      } catch (e) {
        query = {};
      }
    } else if (typeof req.query.query === "object") {
      query = req.query.query;
    } else {
      query = {};
    }
  } else {
    if (typeof req.body.filters === "string") {
      filters = req.body.filters.split(",");
    } else if (Array.isArray(req.body.filters)) {
      filters = req.body.filters;
    }

    query = typeof req.body.query === "object" ? req.body.query : {};
  }

  return { limit, page, orderBy, ascending, filters, query };
};

const normalizeCategoryIds = (categoryIds = [], primaryCategoryId = null) => {
  const ids = Array.isArray(categoryIds)
    ? categoryIds.map(toIdString).filter(Boolean)
    : [];
  const primaryId = toIdString(primaryCategoryId);
  if (primaryId && !ids.includes(primaryId)) {
    ids.push(primaryId);
  }
  return [...new Set(ids)];
};

const normalizeKeywords = (searchKeywords = []) => {
  if (!Array.isArray(searchKeywords)) return [];
  return [...new Set(
    searchKeywords
      .map((keyword) => String(keyword || "").trim().toLowerCase())
      .filter(Boolean),
  )];
};

const normalizeDescription = (description = "") => String(description || "").trim();
const normalizeDeliveryDescription = (value = "") => String(value || "").trim();
const normalizePurchaseNote = (value = "") => String(value || "").trim();
const normalizeAttributes = (attributes = {}) =>
  attributes && typeof attributes === "object" && !Array.isArray(attributes)
    ? attributes
    : {};

const normalizeSeoKeywords = (keywords = []) => {
  if (!Array.isArray(keywords)) return [];
  return [
    ...new Set(
      keywords
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  ];
};

const normalizeSeo = (seo = {}) => {
  const rawSeo = seo && typeof seo === "object" ? seo : {};
  return {
    metaTitle: String(rawSeo.metaTitle || "").trim(),
    metaDescription: String(rawSeo.metaDescription || "").trim(),
    metaKeywords: normalizeSeoKeywords(rawSeo.metaKeywords),
  };
};

const normalizeClaimPolicyId = (value) => {
  const normalized = toIdString(value);
  return normalized || null;
};

const getProductsList = async (req) => {
  const { limit, page, orderBy, ascending, filters, query } = buildListInput(req);
  const pageSize = Math.min(parseInt(limit), 100);
  const skip = pageSize * (page - 1);
  const sortOrder = ascending === "desc" ? -1 : 1;
  const allowedOrderBy = new Set(["name", "slug", "status", "createdAt"]);
  const safeOrderBy = allowedOrderBy.has(String(orderBy))
    ? String(orderBy)
    : "createdAt";

  const validatedListFilters = validateAndNormalizeListFilters({
    filters,
    query,
    schema: Product.schema,
    allowedFields: [
      "name",
      "slug",
      "primaryCategoryId",
      "attributeSetId",
      "status",
      "createdAt",
    ],
    fieldTypeMap: {
      name: "String",
      slug: "String",
      primaryCategoryId: "id",
      attributeSetId: "id",
      status: "Number",
      createdAt: "Date",
    },
    customValidators: {
      name: (value) => {
        const normalized = String(value || "").trim();
        if (!normalized) return { valid: false, error: "Name is required." };
        if (normalized.length < 2 || normalized.length > 120) {
          return {
            valid: false,
            error: "Name must be between 2 and 120 characters.",
          };
        }
        return { valid: true, sanitized: normalized };
      },
      slug: (value) => {
        const normalized = generateSlug(value);
        if (!normalized) return { valid: false, error: "Slug is required." };
        return { valid: true, sanitized: normalized };
      },
    },
  });

  if (!validatedListFilters.valid) {
    return { validationError: validatedListFilters.errors };
  }

  const matchQuery = processSearchFilters(
    validatedListFilters.filters,
    validatedListFilters.query,
  );

  const productsList = await Product.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: "categories",
        localField: "primaryCategoryId",
        foreignField: "_id",
        as: "primaryCategory",
      },
    },
    {
      $unwind: {
        path: "$primaryCategory",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        slug: 1,
        primaryCategoryId: 1,
        categoryIds: 1,
        attributeSetId: 1,
        attributes: 1,
        description: 1,
        seo: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        claimPolicyId: 1,
        primaryCategoryName: "$primaryCategory.name",
      },
    },
    {
      $facet: {
        metadata: [
          { $count: "totalRecord" },
          {
            $addFields: {
              current_page: parseInt(page),
              per_page: pageSize,
            },
          },
        ],
        data: [
          { $sort: { [safeOrderBy]: sortOrder } },
          { $skip: skip },
          { $limit: pageSize },
        ],
      },
    },
  ]).collation({ locale: "en", strength: 1 });

  const summaryList = await Product.aggregate([
    {
      $group: {
        _id: null,
        active: {
          $sum: {
            $cond: [{ $eq: ["$status", 1] }, 1, 0],
          },
        },
        draft: {
          $sum: {
            $cond: [{ $eq: ["$status", 2] }, 1, 0],
          },
        },
        inactive: {
          $sum: {
            $cond: [{ $eq: ["$status", 3] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        active: 1,
        draft: 1,
        inactive: 1,
      },
    },
  ]);

  const summaryData = summaryList?.[0] || {
    active: 0,
    draft: 0,
    inactive: 0,
  };

  const [result] = productsList;
  if (result?.metadata?.length > 0) {
    return {
      data: [{ ...result, summary: [summaryData] }],
      message: "Products List",
    };
  }

  return {
    data: [
      {
        metadata: [{ totalRecord: 0, current_page: page, per_page: pageSize }],
        data: [],
        summary: [summaryData],
      },
    ],
    message: "No Products",
  };
};

const getProductById = async (productId) => {
  const product = await Product.findById(productId)
    .populate("primaryCategoryId", "name slug")
    .populate("categoryIds", "name slug")
    .populate("attributeSetId", "name code")
    .populate("claimPolicyId", "code name isActive")
    .lean();
  if (!product) return null;

  product.sizeChart = sizeChartToPlain(product.sizeChart);

  const variants = await ProductVariant.find({ productId: product._id })
    .sort({ createdAt: 1 })
    .lean();
  const variantIds = variants.map((item) => item._id);
  const inventoryRows = await Inventory.find({
    productVariantId: { $in: variantIds },
  })
    .select("productVariantId stock")
    .lean();
  const stockMap = new Map(
    inventoryRows.map((item) => [String(item.productVariantId), Number(item.stock || 0)]),
  );

  product.variants = variants.map((item) => ({
    ...item,
    stock: stockMap.get(String(item._id)) || 0,
  }));
  return product;
};

const createProduct = async ({
  name,
  slug,
  primaryCategoryId,
  categoryIds = [],
  attributeSetId,
  attributes = {},
  description = "",
  deliveryDescription = "",
  purchaseNote = "",
  seo = {},
  searchKeywords = [],
  status = 1,
  sizeChart,
  claimPolicyId = null,
}) => {
  const normalizedName = String(name).trim();
  const normalizedSlug = generateSlug(slug || normalizedName);
  const normalizedCategoryIds = normalizeCategoryIds(categoryIds, primaryCategoryId);
  const normalizedDescription = normalizeDescription(description);
  const normalizedDeliveryDescription =
    normalizeDeliveryDescription(deliveryDescription);
  const normalizedPurchaseNote = normalizePurchaseNote(purchaseNote);

  const normalizedKeywords = normalizeKeywords(searchKeywords);
  const normalizedSeo = normalizeSeo(seo);
  const normalizedSizeChart = normalizeSizeChart(sizeChart);

  const created = await Product.create({
    name: normalizedName,
    slug: normalizedSlug,
    primaryCategoryId,
    categoryIds: normalizedCategoryIds,
    attributeSetId,
    attributes: normalizeAttributes(attributes),
    description: normalizedDescription,
    deliveryDescription: normalizedDeliveryDescription,
    purchaseNote: normalizedPurchaseNote,
    seo: normalizedSeo,
    searchKeywords: normalizedKeywords,
    status: Number(status) || 1,
    sizeChart: normalizedSizeChart,
    claimPolicyId: normalizeClaimPolicyId(claimPolicyId),
  });
  return created;
};

const updateProduct = async (
  productId,
  {
    name,
    slug,
    primaryCategoryId,
    categoryIds,
    attributeSetId,
    attributes,
    description,
    deliveryDescription,
    purchaseNote,
    seo,
    searchKeywords,
    status,
    sizeChart,
    claimPolicyId,
  },
) => {
  const updates = {};
  if (name !== undefined) {
    updates.name = String(name).trim();
    updates.slug = generateSlug(slug || updates.name);
  } else if (slug !== undefined) {
    updates.slug = generateSlug(slug);
  }

  if (primaryCategoryId !== undefined) updates.primaryCategoryId = primaryCategoryId;
  if (categoryIds !== undefined || primaryCategoryId !== undefined) {
    const baseCategories =
      categoryIds !== undefined ? categoryIds : [];
    const ensuredPrimaryId =
      primaryCategoryId !== undefined ? primaryCategoryId : updates.primaryCategoryId;
    updates.categoryIds = normalizeCategoryIds(baseCategories, ensuredPrimaryId);
  }
  if (attributeSetId !== undefined) updates.attributeSetId = attributeSetId;
  if (attributes !== undefined) {
    updates.attributes = normalizeAttributes(attributes);
  }
  if (description !== undefined) {
    updates.description = normalizeDescription(description);
  }
  if (deliveryDescription !== undefined) {
    updates.deliveryDescription = normalizeDeliveryDescription(deliveryDescription);
  }
  if (purchaseNote !== undefined) {
    updates.purchaseNote = normalizePurchaseNote(purchaseNote);
  }
  if (seo !== undefined) {
    updates.seo = normalizeSeo(seo);
  }
  if (searchKeywords !== undefined) {
    updates.searchKeywords = normalizeKeywords(searchKeywords);
  }
  if (status !== undefined) updates.status = Number(status);
  if (claimPolicyId !== undefined) {
    updates.claimPolicyId = normalizeClaimPolicyId(claimPolicyId);
  }
  if (sizeChart !== undefined) {
    updates.sizeChart = normalizeSizeChart(sizeChart);
  }

  const updated = await Product.findByIdAndUpdate(
    productId,
    { $set: updates },
    { returnDocument: "after", runValidators: true },
  )
    .populate("primaryCategoryId", "name slug")
    .populate("categoryIds", "name slug")
    .populate("attributeSetId", "name code")
    .populate("claimPolicyId", "code name isActive")
    .lean();
  if (updated) updated.sizeChart = sizeChartToPlain(updated.sizeChart);
  return updated;
};

const deleteProduct = async (productId) => Product.findByIdAndDelete(productId).lean();

const hasVariants = async (productId) => {
  const variant = await ProductVariant.findOne({ productId })
    .select("_id")
    .lean();
  return Boolean(variant);
};

const isSlugTaken = async (slug, excludeId = null) => {
  const normalizedSlug = generateSlug(slug);
  const query = excludeId
    ? { slug: normalizedSlug, _id: { $ne: excludeId } }
    : { slug: normalizedSlug };
  const existing = await Product.findOne(query).select("_id").lean();
  return Boolean(existing);
};

module.exports = {
  generateSlug,
  getProductsList,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  hasVariants,
  isSlugTaken,
};
