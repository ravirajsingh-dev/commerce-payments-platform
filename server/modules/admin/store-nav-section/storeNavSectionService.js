const StoreNavSection = require("../../../models/StoreNavSection");
const Product = require("../../../models/Product");
const { getNextSortOrder } = require("../../../shared/utils/getNextSortOrder");

const ACTIVE_STATUS = 1;

const normalizeProductIds = (productIds = []) => {
  if (!Array.isArray(productIds)) return [];
  return [...new Set(productIds.map((id) => String(id).trim()).filter(Boolean))];
};

const getStoreNavSectionsList = async (req) => {
  const {
    limit = 50,
    page = 1,
    orderBy = "columnIndex",
    ascending = "asc",
  } = req.query || req.body;

  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const skip = pageSize * (Math.max(parseInt(page, 10) || 1, 1) - 1);
  const sortOrder = ascending === "desc" ? -1 : 1;
  const allowedOrderBy = new Set(["title", "columnIndex", "sortOrder", "status", "createdAt"]);
  const safeOrderBy = allowedOrderBy.has(String(orderBy)) ? String(orderBy) : "columnIndex";

  const [rows, totalRecord, summaryRows] = await Promise.all([
    StoreNavSection.find()
      .sort({ [safeOrderBy]: sortOrder, sortOrder: 1, title: 1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    StoreNavSection.countDocuments(),
    StoreNavSection.aggregate([
      {
        $group: {
          _id: null,
          active: { $sum: { $cond: [{ $eq: ["$status", 1] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ["$status", 2] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const summary = summaryRows?.[0] || { active: 0, inactive: 0 };

  const data = rows.map((row) => ({
    ...row,
    productCount: Array.isArray(row.productIds) ? row.productIds.length : 0,
  }));

  return {
    data: [
      {
        metadata: [
          {
            totalRecord,
            current_page: Math.max(parseInt(page, 10) || 1, 1),
            per_page: pageSize,
          },
        ],
        data,
        summary: [{ active: summary.active || 0, inactive: summary.inactive || 0 }],
      },
    ],
    message: data.length ? "Store navigation sections" : "No sections",
  };
};

const getStoreNavSectionById = async (sectionId) =>
  StoreNavSection.findById(sectionId).lean();

const createStoreNavSection = async ({
  title,
  columnIndex = 0,
  sortOrder,
  status = 1,
  productIds = [],
}) => {
  const payload = {
    title: String(title).trim(),
    columnIndex: Math.max(0, Math.min(5, Number(columnIndex) || 0)),
    status: Number(status) || 1,
    productIds: normalizeProductIds(productIds),
  };
  payload.sortOrder =
    sortOrder !== undefined && sortOrder !== null && sortOrder !== ""
      ? Number(sortOrder)
      : await getNextSortOrder(StoreNavSection);

  return StoreNavSection.create(payload);
};

const updateStoreNavSection = async (
  sectionId,
  { title, columnIndex, sortOrder, status, productIds },
) => {
  const updates = {};
  if (title !== undefined) updates.title = String(title).trim();
  if (columnIndex !== undefined) {
    updates.columnIndex = Math.max(0, Math.min(5, Number(columnIndex) || 0));
  }
  if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder) || 0;
  if (status !== undefined) updates.status = Number(status);
  if (productIds !== undefined) updates.productIds = normalizeProductIds(productIds);

  return StoreNavSection.findByIdAndUpdate(
    sectionId,
    { $set: updates },
    { returnDocument: "after", runValidators: true },
  ).lean();
};

const deleteStoreNavSection = async (sectionId) =>
  StoreNavSection.findByIdAndDelete(sectionId).lean();

/** Public storefront payload from admin-configured sections. */
const buildStorefrontNavigation = async () => {
  const sections = await StoreNavSection.find({ status: ACTIVE_STATUS })
    .sort({ columnIndex: 1, sortOrder: 1, title: 1 })
    .lean();

  if (!sections.length) {
    return { columns: [] };
  }

  const allProductIds = [
    ...new Set(
      sections.flatMap((row) =>
        (row.productIds || []).map((id) => String(id)),
      ),
    ),
  ];

  const products = allProductIds.length
    ? await Product.find({
        _id: { $in: allProductIds },
        status: ACTIVE_STATUS,
      })
        .select("name slug")
        .lean()
    : [];

  const productById = new Map(products.map((p) => [String(p._id), p]));

  const columnMap = new Map();

  for (const section of sections) {
    const colKey = Number(section.columnIndex) || 0;
    if (!columnMap.has(colKey)) {
      columnMap.set(colKey, {
        id: `col-${colKey}`,
        columnIndex: colKey,
        sections: [],
      });
    }

    const links = (section.productIds || [])
      .map((id) => productById.get(String(id)))
      .filter(Boolean)
      .map((product) => ({
        label: String(product.name || "").trim(),
        slug: String(product.slug || "").trim(),
        path: `/collection/${String(product.slug || "").trim()}`,
      }));

    if (links.length > 0 || section.title) {
      columnMap.get(colKey).sections.push({
        heading: section.title,
        links,
      });
    }
  }

  const columns = Array.from(columnMap.values())
    .filter((col) => col.sections.length > 0)
    .sort((a, b) => a.columnIndex - b.columnIndex);

  return { columns };
};

module.exports = {
  getStoreNavSectionsList,
  getStoreNavSectionById,
  createStoreNavSection,
  updateStoreNavSection,
  deleteStoreNavSection,
  buildStorefrontNavigation,
};
