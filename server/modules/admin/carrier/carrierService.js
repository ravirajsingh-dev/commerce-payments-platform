const { DEFAULT_PAGE_SIZE } = require("../../../config/constants");
const Carrier = require("../../../models/Carrier");
const { generateSlug } = require("../../../shared/utils/generateSlug");
const {
  FULFILLMENT_MODE,
  FULFILLMENT_MODE_SET,
  isOfflineFulfillmentMode,
} = require("../../../shared/constants/carrier");
const { processSearchFilters } = require("../adminSearchHelper");
const {
  validateAndNormalizeListFilters,
} = require("../../../shared/middleware/validateRequest");

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

  return { limit, page, orderBy, ascending, filters, query };
};

const getCarriersList = async (req) => {
  const { limit, page, orderBy, ascending, filters, query } = buildListInput(req);
  const pageSize = Math.min(parseInt(limit, 10), 100);
  const skip = pageSize * (page - 1);
  const sortOrder = ascending === "desc" ? -1 : 1;
  const allowedOrderBy = new Set(["name", "slug", "isActive", "createdAt"]);
  const safeOrderBy = allowedOrderBy.has(String(orderBy))
    ? String(orderBy)
    : "createdAt";

  const validatedListFilters = validateAndNormalizeListFilters({
    filters,
    query,
    schema: Carrier.schema,
    allowedFields: ["name", "slug", "isActive", "fulfillmentMode", "createdAt"],
    fieldTypeMap: {
      name: "String",
      slug: "String",
      isActive: "Boolean",
      fulfillmentMode: "String",
      createdAt: "Date",
    },
    customValidators: {
      name: (value) => {
        const normalized = String(value || "").trim();
        if (!normalized) return { valid: false, error: "Name is required." };
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

  const carriersList = await Carrier.aggregate([
    { $match: matchQuery },
    {
      $project: {
        name: 1,
        slug: 1,
        fulfillmentMode: 1,
        trackingUrl: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
    {
      $facet: {
        metadata: [
          { $count: "totalRecord" },
          {
            $addFields: {
              current_page: parseInt(page, 10),
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

  const summaryList = await Carrier.aggregate([
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

  const summaryData = summaryList?.[0] || { active: 0, inactive: 0 };
  const [result] = carriersList;

  if (result?.metadata?.length > 0) {
    return {
      data: [{ ...result, summary: [summaryData] }],
      message: "Carriers List",
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
    message: "No Carriers",
  };
};

const getCarrierById = async (carrierId) => Carrier.findById(carrierId).lean();

const normalizeSlug = (value) => generateSlug(value);

const isSlugTaken = async (slug, excludeId = null) => {
  const normalizedSlug = normalizeSlug(slug);
  const query = excludeId
    ? { slug: normalizedSlug, _id: { $ne: excludeId } }
    : { slug: normalizedSlug };
  const existing = await Carrier.findOne(query).select("_id").lean();
  return Boolean(existing);
};

const normalizeFulfillmentMode = (value) => {
  const normalized = String(value || FULFILLMENT_MODE.ONLINE.value).trim().toLowerCase();
  return FULFILLMENT_MODE_SET.has(normalized)
    ? normalized
    : FULFILLMENT_MODE.ONLINE.value;
};

const normalizeTrackingUrl = (trackingUrl, fulfillmentMode) => {
  const normalized = String(trackingUrl ?? "").trim();
  if (isOfflineFulfillmentMode(fulfillmentMode)) {
    return normalized;
  }
  return normalized;
};

const createCarrier = async ({
  name,
  slug,
  trackingUrl,
  fulfillmentMode,
  isActive = true,
}) => {
  const normalizedName = String(name).trim();
  const normalizedSlug = normalizeSlug(slug || normalizedName);
  const normalizedFulfillmentMode = normalizeFulfillmentMode(fulfillmentMode);
  const normalizedTrackingUrl = normalizeTrackingUrl(
    trackingUrl,
    normalizedFulfillmentMode,
  );

  return Carrier.create({
    name: normalizedName,
    slug: normalizedSlug,
    fulfillmentMode: normalizedFulfillmentMode,
    trackingUrl: normalizedTrackingUrl,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });
};

const updateCarrier = async (
  carrierId,
  { name, slug, trackingUrl, fulfillmentMode, isActive },
) => {
  const updates = {};

  if (name !== undefined) updates.name = String(name).trim();
  if (slug !== undefined) updates.slug = normalizeSlug(slug);
  else if (name !== undefined) {
    updates.slug = normalizeSlug(name);
  }
  if (fulfillmentMode !== undefined) {
    updates.fulfillmentMode = normalizeFulfillmentMode(fulfillmentMode);
  }
  if (trackingUrl !== undefined) {
    const mode =
      updates.fulfillmentMode !== undefined
        ? updates.fulfillmentMode
        : undefined;
    const existing = mode === undefined ? await Carrier.findById(carrierId).lean() : null;
    const resolvedMode = mode ?? existing?.fulfillmentMode ?? FULFILLMENT_MODE.ONLINE.value;
    updates.trackingUrl = normalizeTrackingUrl(trackingUrl, resolvedMode);
  }
  if (isActive !== undefined) updates.isActive = Boolean(isActive);

  return Carrier.findByIdAndUpdate(
    carrierId,
    { $set: updates },
    { returnDocument: "after", runValidators: true },
  ).lean();
};

const deleteCarrier = async (carrierId) =>
  Carrier.findByIdAndDelete(carrierId).lean();

module.exports = {
  getCarriersList,
  getCarrierById,
  createCarrier,
  updateCarrier,
  deleteCarrier,
  isSlugTaken,
  normalizeSlug,
};
