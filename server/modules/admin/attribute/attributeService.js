const { DEFAULT_PAGE_SIZE } = require("../../../config/constants");
const Attribute = require("../../../models/Attribute");
const AttributeSet = require("../../../models/AttributeSet");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const { isSizeCode } = require("../product-variant/productVariantHelpers");
const { processSearchFilters } = require("../adminSearchHelper");
const {
  validateAndNormalizeListFilters,
} = require("../../../shared/middleware/validateRequest");

const normalizeCode = (value = "") => String(value).trim().toLowerCase();

const normalizeOptions = (inputType, options = []) => {
  if (inputType !== "select") return [];
  if (!Array.isArray(options)) return [];
  return options
    .map((item) => ({
      label: String(item?.label || "").trim(),
      value: String(item?.value || "").trim(),
    }))
    .filter((item) => item.label && item.value);
};

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

const getAttributesList = async (req) => {
  const { limit, page, orderBy, ascending, filters, query } = buildListInput(req);
  const pageSize = Math.min(parseInt(limit), 100);
  const skip = pageSize * (page - 1);
  const sortOrder = ascending === "desc" ? -1 : 1;
  const allowedOrderBy = new Set([
    "name",
    "code",
    "inputType",
    "isActive",
    "createdAt",
  ]);
  const safeOrderBy = allowedOrderBy.has(String(orderBy))
    ? String(orderBy)
    : "createdAt";

  const validatedListFilters = validateAndNormalizeListFilters({
    filters,
    query,
    schema: Attribute.schema,
    allowedFields: [
      "attributeSetId",
      "name",
      "code",
      "inputType",
      "isRequired",
      "isFilterable",
      "isVariant",
      "isActive",
      "createdAt",
    ],
    fieldTypeMap: {
      attributeSetId: "id",
      name: "String",
      code: "String",
      inputType: "String",
      isRequired: "Boolean",
      isFilterable: "Boolean",
      isVariant: "Boolean",
      isActive: "Boolean",
      createdAt: "Date",
    },
  });

  if (!validatedListFilters.valid) {
    return { validationError: validatedListFilters.errors };
  }

  const matchQuery = processSearchFilters(
    validatedListFilters.filters,
    validatedListFilters.query,
  );

  const attributesList = await Attribute.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: "attribute_sets",
        localField: "attributeSetId",
        foreignField: "_id",
        as: "attributeSet",
      },
    },
    {
      $unwind: {
        path: "$attributeSet",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        attributeSetId: 1,
        name: 1,
        code: 1,
        inputType: 1,
        isRequired: 1,
        isFilterable: 1,
        isVariant: 1,
        options: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1,
        attributeSetName: "$attributeSet.name",
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

  const summaryList = await Attribute.aggregate([
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

  const [result] = attributesList;
  if (result?.metadata?.length > 0) {
    return {
      data: [{ ...result, summary: [summaryData] }],
      message: "Attributes List",
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
    message: "No Attributes",
  };
};

const getAttributesOverview = async (req) => {
  const { limit, page, orderBy, ascending, filters, query } = buildListInput(req);
  const pageSize = Math.min(
    Math.max(parseInt(limit, 10) || DEFAULT_PAGE_SIZE, 1),
    100,
  );
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = pageSize * (currentPage - 1);
  const sortOrder = ascending === "desc" ? -1 : 1;
  const allowedOrderBy = new Set(["name", "isActive", "createdAt"]);
  const safeOrderBy = allowedOrderBy.has(String(orderBy))
    ? String(orderBy)
    : "name";

  const validatedListFilters = validateAndNormalizeListFilters({
    filters,
    query,
    schema: AttributeSet.schema,
    allowedFields: ["name", "isActive", "createdAt"],
    fieldTypeMap: {
      name: "String",
      isActive: "Boolean",
      createdAt: "Date",
    },
    customValidators: {
      name: (value) => {
        const normalized = String(value || "").trim();
        if (!normalized) return { valid: false, error: "Name is required." };
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

  const [attributeSets, totalRecord] = await Promise.all([
    AttributeSet.find(matchQuery)
      .select("_id name isActive")
      .sort({ [safeOrderBy]: sortOrder })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    AttributeSet.countDocuments(matchQuery),
  ]);

  const attributeSetIds = attributeSets.map((item) => item._id);
  if (attributeSetIds.length === 0) {
    return {
      data: [
        {
          metadata: [{ totalRecord: 0, current_page: currentPage, per_page: pageSize }],
          data: [],
        },
      ],
      message: "No Attributes Overview",
    };
  }

  const [attributeCounts, activeCounts] = await Promise.all([
    Attribute.aggregate([
      {
        $match: {
          attributeSetId: { $in: attributeSetIds },
        },
      },
      {
        $group: {
          _id: "$attributeSetId",
          attributeCount: { $sum: 1 },
        },
      },
    ]),
    Attribute.aggregate([
      {
        $match: {
          attributeSetId: { $in: attributeSetIds },
          isActive: true,
        },
      },
      {
        $group: {
          _id: "$attributeSetId",
          activeCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const countMap = new Map(
    (attributeCounts || []).map((row) => [
      String(row._id),
      Number(row.attributeCount || 0),
    ]),
  );
  const activeMap = new Map(
    (activeCounts || []).map((row) => [String(row._id), Number(row.activeCount || 0)]),
  );

  const rows = attributeSets.map((attributeSet) => {
    const attributeSetId = String(attributeSet._id);
    const attributeCount = countMap.get(attributeSetId) || 0;
    const activeCount = activeMap.get(attributeSetId) || 0;
    return {
      attributeSetId,
      attributeSetName: attributeSet.name || "Untitled Attribute Set",
      isActive: attributeSet.isActive !== false,
      attributeCount,
      inactiveCount: Math.max(attributeCount - activeCount, 0),
    };
  });

  return {
    data: [
      {
        metadata: [{ totalRecord, current_page: currentPage, per_page: pageSize }],
        data: rows,
      },
    ],
    message: "Attributes overview",
  };
};

const getAttributeById = async (attributeId) =>
  Attribute.findById(attributeId).populate("attributeSetId", "name code").lean();

const createAttribute = async (payload) => {
  const inputType = payload.inputType || "text";
  return Attribute.create({
    attributeSetId: payload.attributeSetId,
    name: String(payload.name).trim(),
    code: normalizeCode(payload.code),
    inputType,
    isRequired: Boolean(payload.isRequired),
    isFilterable: Boolean(payload.isFilterable),
    isVariant: Boolean(payload.isVariant),
    options: normalizeOptions(inputType, payload.options),
    isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
  });
};

const updateAttribute = async (attributeId, payload) => {
  const updates = {};
  if (payload.attributeSetId !== undefined)
    updates.attributeSetId = payload.attributeSetId;
  if (payload.name !== undefined) updates.name = String(payload.name).trim();
  if (payload.code !== undefined) updates.code = normalizeCode(payload.code);
  if (payload.inputType !== undefined) updates.inputType = payload.inputType;
  if (payload.isRequired !== undefined) updates.isRequired = Boolean(payload.isRequired);
  if (payload.isFilterable !== undefined)
    updates.isFilterable = Boolean(payload.isFilterable);
  if (payload.isVariant !== undefined) updates.isVariant = Boolean(payload.isVariant);
  if (payload.isActive !== undefined) updates.isActive = Boolean(payload.isActive);

  const resolvedInputType = updates.inputType || payload.inputType;
  if (payload.options !== undefined) {
    updates.options = normalizeOptions(resolvedInputType, payload.options);
  } else if (resolvedInputType && resolvedInputType !== "select") {
    updates.options = [];
  }

  return Attribute.findByIdAndUpdate(
    attributeId,
    { $set: updates },
    { returnDocument: "after", runValidators: true },
  )
    .populate("attributeSetId", "name code")
    .lean();
};

const deleteAttribute = async (attributeId) =>
  Attribute.findByIdAndDelete(attributeId).lean();

const getAttributeUsage = async (attributeId) => {
  const attribute = await Attribute.findById(attributeId)
    .select("attributeSetId code")
    .lean();
  if (!attribute) return null;

  const keyPath = `attributes.${attribute.code}`;
  const productIds = await Product.find({ attributeSetId: attribute.attributeSetId })
    .select("_id")
    .lean();
  const linkedProductIds = productIds.map((item) => item._id);

  const variantQuery =
    linkedProductIds.length > 0
      ? isSizeCode(attribute.code)
        ? {
            productId: { $in: linkedProductIds },
            sizes: { $elemMatch: { value: { $exists: true, $nin: [null, ""] } } },
          }
        : {
            productId: { $in: linkedProductIds },
            [keyPath]: { $exists: true, $nin: [null, ""] },
          }
      : null;

  const [usedInProducts, usedInVariantsRow] = await Promise.all([
    Product.findOne({
      attributeSetId: attribute.attributeSetId,
      [keyPath]: { $exists: true },
    })
      .select("_id")
      .lean(),
    variantQuery
      ? ProductVariant.findOne(variantQuery).select("_id").lean()
      : Promise.resolve(null),
  ]);

  return {
    usedInProducts: Boolean(usedInProducts),
    usedInVariants: Boolean(usedInVariantsRow),
  };
};

/**
 * Distinct option values stored on variants for this attribute (sizes array for size axis,
 * otherwise the `attributes` map).
 */
const collectOptionValuesUsedInVariants = async (attributeSetId, attributeCode) => {
  const code = normalizeCode(attributeCode);
  const productIds = await Product.find({ attributeSetId }).distinct("_id");
  if (!productIds.length) return new Set();

  if (isSizeCode(code)) {
    const rows = await ProductVariant.aggregate([
      { $match: { productId: { $in: productIds } } },
      { $unwind: { path: "$sizes", preserveNullAndEmptyArrays: false } },
      { $group: { _id: "$sizes.value" } },
    ]);
    return new Set(
      rows
        .map((row) => String(row._id ?? "").trim().toLowerCase())
        .filter(Boolean),
    );
  }

  const rows = await ProductVariant.aggregate([
    { $match: { productId: { $in: productIds } } },
    {
      $project: {
        matchPair: {
          $first: {
            $filter: {
              input: { $objectToArray: { $ifNull: ["$attributes", {}] } },
              as: "p",
              cond: { $eq: [{ $toLower: "$$p.k" }, code] },
            },
          },
        },
      },
    },
    { $match: { "matchPair.v": { $nin: [null, ""] } } },
    { $group: { _id: "$matchPair.v" } },
  ]);
  return new Set(rows.map((row) => String(row._id ?? "").trim()).filter(Boolean));
};

const optionListToValueSet = (options = []) =>
  new Set(
    (Array.isArray(options) ? options : [])
      .map((item) => String(item?.value ?? "").trim())
      .filter(Boolean),
  );

const valueStillInUse = (rawValue, inUseSet, { sizeAxis } = {}) => {
  const v = String(rawValue ?? "").trim();
  if (!v) return false;
  if (sizeAxis) {
    return inUseSet.has(v.toLowerCase());
  }
  const lower = v.toLowerCase();
  for (const used of inUseSet) {
    if (String(used).trim().toLowerCase() === lower) return true;
  }
  return false;
};

/**
 * Validates attribute definition changes that would break existing variants.
 * Returns `{ validationError: [{ path?, msg }] }` or `null`.
 */
const validateAttributeMutationBeforeUpdate = async (attributeId, payload = {}) => {
  const existing = await Attribute.findById(attributeId).lean();
  if (!existing) {
    return { validationError: [{ msg: "Attribute not found." }] };
  }

  const nextInputType =
    payload.inputType !== undefined ? payload.inputType : existing.inputType;
  const nextIsVariant =
    payload.isVariant !== undefined ? Boolean(payload.isVariant) : existing.isVariant;
  const nextCode =
    payload.code !== undefined ? normalizeCode(payload.code) : existing.code;
  const nextAttributeSetId =
    payload.attributeSetId !== undefined
      ? payload.attributeSetId
      : existing.attributeSetId;

  const usage = await getAttributeUsage(attributeId);
  const usedInVariants = Boolean(usage?.usedInVariants);

  if (usedInVariants) {
    if (nextIsVariant === false && existing.isVariant === true) {
      return {
        validationError: [
          {
            msg: "This attribute is used on product variants; it cannot be turned off as a variant attribute until variants are updated.",
          },
        ],
      };
    }
    if (String(nextCode) !== String(existing.code)) {
      return {
        validationError: [
          {
            path: "code",
            msg: "Attribute code cannot be changed while variants reference this attribute.",
          },
        ],
      };
    }
    if (String(nextAttributeSetId) !== String(existing.attributeSetId)) {
      return {
        validationError: [
          {
            path: "attributeSetId",
            msg: "Attribute set cannot be changed while variants reference this attribute.",
          },
        ],
      };
    }
    if (existing.inputType === "select" && nextInputType !== "select") {
      const inUse = await collectOptionValuesUsedInVariants(
        existing.attributeSetId,
        existing.code,
      );
      if (inUse.size > 0) {
        return {
          validationError: [
            {
              path: "inputType",
              msg: "Cannot change input type away from Select while variants still use this attribute's values.",
            },
          ],
        };
      }
    }
  }

  if (nextInputType === "select" && (payload.options !== undefined || nextInputType !== existing.inputType)) {
    const nextOptions = normalizeOptions(
      "select",
      payload.options !== undefined ? payload.options : existing.options,
    );
    const prevOptions = normalizeOptions("select", existing.options);
    const nextVals = optionListToValueSet(nextOptions);
    const removed = prevOptions.filter(
      (opt) => !nextVals.has(String(opt?.value ?? "").trim()),
    );
    if (removed.length > 0) {
      const inUse = await collectOptionValuesUsedInVariants(
        existing.attributeSetId,
        existing.code,
      );
      const sizeAxis = isSizeCode(existing.code);
      const blocked = removed.filter((opt) =>
        valueStillInUse(opt.value, inUse, { sizeAxis }),
      );
      if (blocked.length > 0) {
        const sample = blocked
          .map((b) => String(b.label || b.value || "").trim())
          .filter(Boolean)
          .join(", ");
        return {
          validationError: [
            {
              path: "options",
              msg: `Cannot remove option(s) still used on variants: ${sample}`,
            },
          ],
        };
      }
    }
  }

  return null;
};

const isCodeTaken = async (attributeSetId, code, excludeId = null) => {
  const normalizedCode = normalizeCode(code);
  const query = excludeId
    ? { attributeSetId, code: normalizedCode, _id: { $ne: excludeId } }
    : { attributeSetId, code: normalizedCode };
  const existing = await Attribute.findOne(query).select("_id").lean();
  return Boolean(existing);
};

module.exports = {
  normalizeCode,
  normalizeOptions,
  getAttributesList,
  getAttributesOverview,
  getAttributeById,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  getAttributeUsage,
  isCodeTaken,
  collectOptionValuesUsedInVariants,
  validateAttributeMutationBeforeUpdate,
};
