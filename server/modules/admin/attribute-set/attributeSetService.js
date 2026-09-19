const { DEFAULT_PAGE_SIZE } = require("../../../config/constants");
const AttributeSet = require("../../../models/AttributeSet");
const Attribute = require("../../../models/Attribute");
const Product = require("../../../models/Product");
const { processSearchFilters } = require("../adminSearchHelper");
const {
  validateAndNormalizeListFilters,
} = require("../../../shared/middleware/validateRequest");

const normalizeCode = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const buildListInput = (req) => {
  const queryInput = req.query || {};
  const bodyInput = req.body || {};
  const {
    limit = DEFAULT_PAGE_SIZE,
    page = 1,
    orderBy = "createdAt",
    ascending = "desc",
  } = queryInput;

  let filters = [];
  let query = {};

  if (queryInput.limit) {
    if (typeof queryInput.filters === "string") {
      filters = queryInput.filters.split(",");
    } else if (Array.isArray(queryInput.filters)) {
      filters = queryInput.filters;
    }

    if (typeof queryInput.query === "string") {
      try {
        query = JSON.parse(queryInput.query);
      } catch (e) {
        query = {};
      }
    } else if (typeof queryInput.query === "object") {
      query = queryInput.query;
    } else {
      query = {};
    }
  } else {
    if (typeof bodyInput.filters === "string") {
      filters = bodyInput.filters.split(",");
    } else if (Array.isArray(bodyInput.filters)) {
      filters = bodyInput.filters;
    }

    query = typeof bodyInput.query === "object" ? bodyInput.query : {};
  }

  // Support lightweight list call: /list?status=1|2
  if (queryInput.status !== undefined && queryInput.status !== "") {
    const statusValue = Number(queryInput.status);
    if ([1, 2].includes(statusValue)) {
      if (!filters.includes("isActive")) filters.push("isActive");
      query.isActive = { value: statusValue === 1, type: "Boolean" };
    }
  }

  return { limit, page, orderBy, ascending, filters, query };
};

const getAttributeSetsList = async (req) => {
  const { limit, page, orderBy, ascending, filters, query } = buildListInput(req);
  const pageSize = Math.min(parseInt(limit), 100);
  const skip = pageSize * (page - 1);
  const sortOrder = ascending === "desc" ? -1 : 1;
  const allowedOrderBy = new Set(["name", "code", "isActive", "createdAt"]);
  const safeOrderBy = allowedOrderBy.has(String(orderBy))
    ? String(orderBy)
    : "createdAt";

  const validatedListFilters = validateAndNormalizeListFilters({
    filters,
    query,
    schema: AttributeSet.schema,
    allowedFields: ["name", "code", "isActive", "createdAt"],
    fieldTypeMap: {
      name: "String",
      code: "String",
      isActive: "Boolean",
      createdAt: "Date",
    },
    customValidators: {
      name: (value) => {
        const normalized = String(value || "").trim();
        if (!normalized) return { valid: false, error: "Name is required." };
        return { valid: true, sanitized: normalized };
      },
      code: (value) => {
        const normalized = normalizeCode(value);
        if (!normalized) return { valid: false, error: "Code is required." };
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

  const attributeSetList = await AttributeSet.aggregate([
    { $match: matchQuery },
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

  const summaryList = await AttributeSet.aggregate([
    {
      $group: {
        _id: null,
        active: {
          $sum: {
            $cond: [{ $eq: ["$isActive", true] }, 1, 0],
          },
        },
        inactive: {
          $sum: {
            $cond: [{ $eq: ["$isActive", false] }, 1, 0],
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

  const [result] = attributeSetList;
  if (result?.metadata?.length > 0) {
    return {
      data: [{ ...result, summary: [summaryData] }],
      message: "Attribute Sets List",
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
    message: "No Attribute Sets",
  };
};

const getAttributeSetById = async (attributeSetId) =>
  AttributeSet.findById(attributeSetId).lean();

const createAttributeSet = async ({ name, code, isActive = true }) => {
  const normalizedName = String(name).trim();
  const normalizedCode = normalizeCode(code || normalizedName);
  return AttributeSet.create({
    name: normalizedName,
    code: normalizedCode,
    isActive: Boolean(isActive),
  });
};

const updateAttributeSet = async (attributeSetId, { name, code, isActive }) => {
  const updates = {};
  if (name !== undefined) {
    updates.name = String(name).trim();
    updates.code = normalizeCode(code || updates.name);
  } else if (code !== undefined) {
    updates.code = normalizeCode(code);
  }
  if (isActive !== undefined) updates.isActive = Boolean(isActive);

  return AttributeSet.findByIdAndUpdate(
    attributeSetId,
    { $set: updates },
    { returnDocument: "after", runValidators: true },
  ).lean();
};

const deleteAttributeSet = async (attributeSetId) =>
  AttributeSet.findByIdAndDelete(attributeSetId).lean();

const hasAttributes = async (attributeSetId) => {
  const attribute = await Attribute.findOne({ attributeSetId })
    .select("_id")
    .lean();
  return Boolean(attribute);
};

const hasProducts = async (attributeSetId) => {
  const product = await Product.findOne({ attributeSetId })
    .select("_id")
    .lean();
  return Boolean(product);
};

const isCodeTaken = async (code, excludeId = null) => {
  const normalizedCode = normalizeCode(code);
  const query = excludeId
    ? { code: normalizedCode, _id: { $ne: excludeId } }
    : { code: normalizedCode };
  const existing = await AttributeSet.findOne(query).select("_id").lean();
  return Boolean(existing);
};

module.exports = {
  normalizeCode,
  getAttributeSetsList,
  getAttributeSetById,
  createAttributeSet,
  updateAttributeSet,
  deleteAttributeSet,
  hasAttributes,
  hasProducts,
  isCodeTaken,
};
