const { DEFAULT_PAGE_SIZE } = require("../../../config/constants");
const Category = require("../../../models/Category");
const Product = require("../../../models/Product");
const { processSearchFilters } = require("../adminSearchHelper");
const { generateSlug } = require("../../../shared/utils/generateSlug");
const { getNextSortOrder } = require("../../../shared/utils/getNextSortOrder");
const {
  validateAndNormalizeListFilters,
} = require("../../../shared/middleware/validateRequest");

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

const getCategoriesList = async (req) => {
  const { limit, page, orderBy, ascending, filters, query } =
    buildListInput(req);
  const pageSize = Math.min(parseInt(limit), 100);
  const skip = pageSize * (page - 1);
  const sortOrder = ascending === "desc" ? -1 : 1;
  const allowedOrderBy = new Set([
    "name",
    "slug",
    "status",
    "sortOrder",
    "createdAt",
  ]);
  const safeOrderBy = allowedOrderBy.has(String(orderBy))
    ? String(orderBy)
    : "createdAt";

  const validatedListFilters = validateAndNormalizeListFilters({
    filters,
    query,
    schema: Category.schema,
    allowedFields: [
      "name",
      "slug",
      "parentCategoryId",
      "status",
      "sortOrder",
      "createdAt",
    ],
    fieldTypeMap: {
      name: "String",
      slug: "String",
      parentCategoryId: "id",
      status: "Number",
      sortOrder: "Number",
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

  const categoriesList = await Category.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: "categories",
        localField: "parentCategoryId",
        foreignField: "_id",
        as: "parentCategory",
      },
    },
    {
      $unwind: {
        path: "$parentCategory",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        slug: 1,
        parentCategoryId: 1,
        status: 1,
        sortOrder: 1,
        createdAt: 1,
        updatedAt: 1,
        parentCategoryName: "$parentCategory.name",
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

  const summaryList = await Category.aggregate([
    {
      $group: {
        _id: null,
        active: {
          $sum: {
            $cond: [{ $eq: ["$status", 1] }, 1, 0],
          },
        },
        inactive: {
          $sum: {
            $cond: [{ $eq: ["$status", 2] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        active: 1,
        inactive: 1,
      },
    },
  ]);

  const summaryData = summaryList?.[0] || {
    active: 0,
    inactive: 0,
  };

  const [result] = categoriesList;
  if (result?.metadata?.length > 0) {
    return {
      data: [{ ...result, summary: [summaryData] }],
      message: "Categories List",
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
    message: "No Categories",
  };
};

const getCategoryById = async (categoryId) =>
  Category.findById(categoryId)
    .populate("parentCategoryId", "name slug")
    .lean();

const createCategory = async ({
  name,
  slug,
  status = 1,
  sortOrder,
  parentCategoryId,
}) => {
  const normalizedName = String(name).trim();
  const normalizedSlug = generateSlug(slug || normalizedName);
  const payload = {
    name: normalizedName,
    slug: normalizedSlug,
    status: Number(status) || 1,
    parentCategoryId: parentCategoryId || null,
  };
  payload.sortOrder =
    sortOrder !== undefined && sortOrder !== null && sortOrder !== ""
      ? Number(sortOrder)
      : await getNextSortOrder(Category);

  return Category.create(payload);
};

const updateCategory = async (
  categoryId,
  { name, slug, status, sortOrder, parentCategoryId },
) => {
  const updates = {};
  if (name !== undefined) {
    updates.name = String(name).trim();
    updates.slug = generateSlug(slug || updates.name);
  } else if (slug !== undefined) {
    updates.slug = generateSlug(slug);
  }
  if (status !== undefined) updates.status = Number(status);
  if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder) || 0;
  if (parentCategoryId !== undefined)
    updates.parentCategoryId = parentCategoryId || null;

  return Category.findByIdAndUpdate(
    categoryId,
    { $set: updates },
    { returnDocument: "after", runValidators: true },
  )
    .populate("parentCategoryId", "name slug")
    .lean();
};

const deleteCategory = async (categoryId) =>
  Category.findByIdAndDelete(categoryId).lean();

const hasChildren = async (categoryId) => {
  const child = await Category.findOne({ parentCategoryId: categoryId })
    .select("_id")
    .lean();
  return Boolean(child);
};

const hasProducts = async (categoryId) => {
  const linkedProduct = await Product.findOne({
    $or: [{ primaryCategoryId: categoryId }, { categoryIds: categoryId }],
  })
    .select("_id")
    .lean();
  return Boolean(linkedProduct);
};

const isSlugTaken = async (slug, excludeId = null) => {
  const normalizedSlug = generateSlug(slug);
  const query = excludeId
    ? { slug: normalizedSlug, _id: { $ne: excludeId } }
    : { slug: normalizedSlug };
  const existing = await Category.findOne(query).select("_id").lean();
  return Boolean(existing);
};

module.exports = {
  generateSlug,
  getCategoriesList,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  hasChildren,
  hasProducts,
  isSlugTaken,
};
