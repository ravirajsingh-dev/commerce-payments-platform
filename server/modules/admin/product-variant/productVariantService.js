const { DEFAULT_PAGE_SIZE } = require("../../../config/constants");
const mongoose = require("mongoose");
const ProductVariant = require("../../../models/ProductVariant");
const Product = require("../../../models/Product");
const Inventory = require("../../../models/Inventory");
const { processSearchFilters } = require("../adminSearchHelper");
const {
  uploadFileToR2,
  deleteFileFromR2,
  deleteMultipleFromR2,
  normalizePublicId,
} = require("../../../utils/r2Helper");
const {
  validateAndNormalizeListFilters,
} = require("../../../shared/middleware/validateRequest");
const {
  buildListInput,
  normalizeAttributesObject,
  normalizeSku,
  normalizeVariantName,
  normalizeShortDescription,
  normalizeVariantImages,
  normalizeStock,
  normalizeSizes,
  variantDocToPlain,
  normalizeIsNewArrival,
  normalizeVariantDiscountFields,
  computeVariantTotalStock,
} = require("./productVariantHelpers");

const uploadVariantImageFile = async (file) => {
  const uploadResult = await uploadFileToR2(file, "product-variants");
  return {
    url: uploadResult.url,
    publicId: uploadResult.publicId,
  };
};

const uploadVariantImageFiles = async (files = []) => {
  const normalizedFiles = Array.isArray(files) ? files.filter(Boolean) : [];
  if (normalizedFiles.length === 0) return [];

  const uploadedPublicIds = [];
  try {
    const uploaded = await Promise.all(
      normalizedFiles.map(async (file) => {
        const result = await uploadVariantImageFile(file);
        if (result?.publicId) uploadedPublicIds.push(result.publicId);
        return result;
      }),
    );
    return uploaded;
  } catch (err) {
    await deleteMultipleFromR2(uploadedPublicIds);
    throw err;
  }
};

const upsertInventoryForVariant = async (productVariantId, stock = 0) =>
  Inventory.findOneAndUpdate(
    { productVariantId },
    { $set: { stock: normalizeStock(stock, 0) } },
    { upsert: true, returnDocument: "after", runValidators: true },
  ).lean();

const getProductVariantsList = async (req) => {
  const { limit, page, orderBy, ascending, filters, query } =
    buildListInput(req);
  const pageSize = Math.min(
    Math.max(parseInt(limit, 10) || DEFAULT_PAGE_SIZE, 1),
    100,
  );
  const skip = pageSize * (page - 1);
  const sortOrder = ascending === "desc" ? -1 : 1;
  const allowedOrderBy = new Set([
    "sku",
    "price",
    "stock",
    "status",
    "createdAt",
  ]);
  const safeOrderBy = allowedOrderBy.has(String(orderBy))
    ? String(orderBy)
    : "createdAt";

  const validatedListFilters = validateAndNormalizeListFilters({
    filters,
    query,
    schema: ProductVariant.schema,
    allowedFields: ["productId", "sku", "status", "price", "createdAt"],
    fieldTypeMap: {
      productId: "id",
      sku: "String",
      status: "Number",
      price: "Number",
      createdAt: "Date",
    },
    customValidators: {
      sku: (value) => {
        const normalized = String(value || "").trim();
        if (!normalized) return { valid: false, error: "SKU is required." };
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
  const nameFilterValue = String(query?.name?.value || "").trim();

  const variantsList = await ProductVariant.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
      },
    },
    {
      $unwind: {
        path: "$product",
        preserveNullAndEmptyArrays: true,
      },
    },
    ...(nameFilterValue
      ? [
          {
            $match: {
              "product.name": { $regex: new RegExp(nameFilterValue, "i") },
            },
          },
        ]
      : []),
    {
      $lookup: {
        from: "inventories",
        localField: "_id",
        foreignField: "productVariantId",
        as: "inventoryRows",
      },
    },
    {
      $addFields: {
        productName: "$product.name",
        productFallbackImage: {
          $let: {
            vars: { pi: { $arrayElemAt: ["$product.images", 0] } },
            in: { $ifNull: ["$$pi.url", ""] },
          },
        },
        variantThumbUrl: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$images", []] } }, 0] },
            {
              $let: {
                vars: { vi: { $arrayElemAt: ["$images", 0] } },
                in: "$$vi.url",
              },
            },
            {
              $let: {
                vars: { pi: { $arrayElemAt: ["$product.images", 0] } },
                in: { $ifNull: ["$$pi.url", ""] },
              },
            },
          ],
        },
        stock: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$sizes", []] } }, 0] },
            {
              // Sized variants: total stock = sum of per-size stocks
              $sum: {
                $map: {
                  input: { $ifNull: ["$sizes", []] },
                  as: "sz",
                  in: { $ifNull: ["$$sz.stock", 0] },
                },
              },
            },
            {
              // Legacy variants: pull from the matching Inventory row
              $let: {
                vars: {
                  inv: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: { $ifNull: ["$inventoryRows", []] },
                          as: "inventoryRow",
                          cond: {
                            $eq: ["$$inventoryRow.productVariantId", "$_id"],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ["$$inv.stock", 0] },
              },
            },
          ],
        },
      },
    },
    {
      $project: {
        product: 0,
        inventoryRows: 0,
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

  const summaryList = await ProductVariant.aggregate([
    { $match: matchQuery },
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

  const [result] = variantsList;
  if (result?.metadata?.length > 0) {
    return {
      data: [{ ...result, summary: [summaryData] }],
      message: "Product Variants List",
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
    message: "No Product Variants",
  };
};

const getProductVariantsOverview = async (req) => {
  const { limit, page, orderBy, ascending, filters, query } =
    buildListInput(req);
  const pageSize = Math.min(
    Math.max(parseInt(limit, 10) || DEFAULT_PAGE_SIZE, 1),
    100,
  );
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = pageSize * (currentPage - 1);
  const sortOrder = ascending === "desc" ? -1 : 1;
  const allowedOrderBy = new Set(["name", "status", "createdAt"]);
  const safeOrderBy = allowedOrderBy.has(String(orderBy))
    ? String(orderBy)
    : "name";

  const validatedListFilters = validateAndNormalizeListFilters({
    filters,
    query,
    schema: Product.schema,
    allowedFields: ["name", "primaryCategoryId", "status", "createdAt"],
    fieldTypeMap: {
      name: "String",
      primaryCategoryId: "id",
      status: "Number",
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

  const [products, totalRecord] = await Promise.all([
    Product.find(matchQuery)
      .select("_id name status primaryCategoryId")
      .sort({ [safeOrderBy]: sortOrder })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Product.countDocuments(matchQuery),
  ]);

  const productIds = products.map((item) => item._id);
  if (productIds.length === 0) {
    return {
      data: [
        {
          metadata: [
            { totalRecord: 0, current_page: currentPage, per_page: pageSize },
          ],
          data: [],
        },
      ],
      message: "No Product Variants Overview",
    };
  }

  const [variantCounts, sizedStockTotals, legacyStockTotals] = await Promise.all([
    ProductVariant.aggregate([
      {
        $match: {
          productId: { $in: productIds },
        },
      },
      {
        $group: {
          _id: "$productId",
          variantCount: { $sum: 1 },
        },
      },
    ]),
    // Sized variants: sum embedded per-size stocks per product
    ProductVariant.aggregate([
      { $match: { productId: { $in: productIds } } },
      { $unwind: { path: "$sizes", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: "$productId",
          total: { $sum: { $ifNull: ["$sizes.stock", 0] } },
        },
      },
    ]),
    // Legacy variants: pick up Inventory rows for variants without sizes
    Inventory.aggregate([
      {
        $lookup: {
          from: "product_variants",
          localField: "productVariantId",
          foreignField: "_id",
          as: "variant",
        },
      },
      {
        $unwind: {
          path: "$variant",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          "variant.productId": { $in: productIds },
          $or: [
            { "variant.sizes": { $exists: false } },
            { "variant.sizes": { $size: 0 } },
          ],
        },
      },
      {
        $group: {
          _id: "$variant.productId",
          totalStock: { $sum: { $ifNull: ["$stock", 0] } },
        },
      },
    ]),
  ]);
  const stockTotals = [
    ...(sizedStockTotals || []).map((row) => ({ _id: row._id, totalStock: row.total })),
    ...(legacyStockTotals || []),
  ];

  const countMap = new Map(
    (variantCounts || []).map((row) => [
      String(row._id),
      Number(row.variantCount || 0),
    ]),
  );
  const stockMap = new Map();
  (stockTotals || []).forEach((row) => {
    const key = String(row._id);
    const existing = stockMap.get(key) || 0;
    stockMap.set(key, existing + Number(row.totalStock || 0));
  });

  const rows = products.map((product) => {
    const productId = String(product._id);
    return {
      productId,
      productName: product.name || "Untitled Product",
      status: Number(product.status || 1),
      variantCount: countMap.get(productId) || 0,
      totalStock: stockMap.get(productId) || 0,
    };
  });

  return {
    data: [
      {
        metadata: [
          { totalRecord, current_page: currentPage, per_page: pageSize },
        ],
        data: rows,
      },
    ],
    message: "Product variants overview",
  };
};

const getProductVariantById = async (variantId) => {
  const doc = await ProductVariant.findById(variantId)
    .populate("productId", "name slug attributeSetId")
    .lean();
  if (!doc) return null;
  if (doc.attributes instanceof Map) {
    doc.attributes = Object.fromEntries(doc.attributes);
  }
  if (!Array.isArray(doc.sizes)) doc.sizes = [];
  if (doc.sizes.length > 0) {
    doc.stock = computeVariantTotalStock(doc);
  } else {
    const inv = await Inventory.findOne({ productVariantId: doc._id })
      .select("stock")
      .lean();
    doc.stock = Number(inv?.stock || 0);
  }
  return doc;
};

const getVariantsByProductId = async (productId) =>
  ProductVariant.find({ productId })
    .sort({ sku: 1 })
    .lean()
    .then(async (rows) => {
      const variantIds = rows.map((row) => row._id);
      // Only legacy variants without sizes need an Inventory lookup; sized variants own stock inline.
      const legacyIds = rows
        .filter((row) => !Array.isArray(row.sizes) || row.sizes.length === 0)
        .map((row) => row._id);
      const inventoryRows = legacyIds.length
        ? await Inventory.find({ productVariantId: { $in: legacyIds } })
            .select("productVariantId stock")
            .lean()
        : [];
      const inventoryMap = new Map(
        inventoryRows.map((item) => [
          String(item.productVariantId),
          Number(item.stock || 0),
        ]),
      );
      return rows.map((row) => {
        const plain =
          row.attributes instanceof Map
            ? { ...row, attributes: Object.fromEntries(row.attributes) }
            : { ...row };
        if (!Array.isArray(plain.sizes)) plain.sizes = [];
        plain.stock =
          plain.sizes.length > 0
            ? computeVariantTotalStock(plain)
            : inventoryMap.get(String(plain._id)) || 0;
        return plain;
      });
    });

const createProductVariant = async ({
  productId,
  sku,
  name = "",
  shortDescription = "",
  attributes = {},
  price,
  discountType,
  discountValue,
  status = 1,
  isNewArrival = false,
  images = [],
  stock = 0,
  sizes = [],
}) => {
  const normalizedSku = normalizeSku(sku);
  const normalizedAttrs = normalizeAttributesObject(attributes);
  const normalizedSizes = normalizeSizes(sizes);

  const attributeFingerprint =
    typeof ProductVariant.computeAttributeFingerprint === "function"
      ? ProductVariant.computeAttributeFingerprint(normalizedAttrs)
      : "";

  const listPrice = Number(price);
  const discountFields = normalizeVariantDiscountFields(
    discountType,
    discountValue,
    listPrice,
  );

  const created = await ProductVariant.create({
    productId,
    sku: normalizedSku,
    name: normalizeVariantName(name),
    shortDescription: normalizeShortDescription(shortDescription),
    attributes: normalizedAttrs,
    attributeFingerprint,
    price: listPrice,
    discountType: discountFields.discountType,
    discountValue: discountFields.discountValue,
    status: Number(status) || 1,
    isNewArrival: normalizeIsNewArrival(isNewArrival),
    images: normalizeVariantImages(images),
    sizes: normalizedSizes,
  });

  // When sizes are present, per-size stock is the source of truth and the legacy Inventory
  // row is ignored. We only persist the single inventory row for variants without sizes.
  if (normalizedSizes.length === 0) {
    await upsertInventoryForVariant(created._id, stock);
  } else {
    await Inventory.deleteOne({ productVariantId: created._id }).catch(() => null);
  }
  const plain = variantDocToPlain(created);
  plain.sizes = normalizedSizes;
  plain.stock = computeVariantTotalStock(plain, stock);
  return plain;
};

const updateProductVariant = async (
  variantId,
  {
    sku,
    name,
    shortDescription,
    attributes,
    price,
    discountType,
    discountValue,
    status,
    isNewArrival,
    images,
    removedImagePublicIds,
    stock,
    sizes,
  },
) => {
  const existingVariant = await ProductVariant.findById(variantId)
    .select("images sizes")
    .lean();
  if (!existingVariant) return null;

  const updates = {};
  if (sku !== undefined) updates.sku = normalizeSku(sku);
  if (name !== undefined) updates.name = normalizeVariantName(name);
  if (shortDescription !== undefined) {
    updates.shortDescription = normalizeShortDescription(shortDescription);
  }
  if (attributes !== undefined) {
    updates.attributes = normalizeAttributesObject(attributes);
    if (typeof ProductVariant.computeAttributeFingerprint === "function") {
      updates.attributeFingerprint = ProductVariant.computeAttributeFingerprint(
        updates.attributes,
      );
    }
  }
  if (price !== undefined) updates.price = Number(price);
  if (discountType !== undefined || discountValue !== undefined) {
    const existingFull = await ProductVariant.findById(variantId)
      .select("price discountType discountValue")
      .lean();
    const listPrice =
      price !== undefined ? Number(price) : Number(existingFull?.price) || 0;
    const discountFields = normalizeVariantDiscountFields(
      discountType !== undefined ? discountType : existingFull?.discountType,
      discountValue !== undefined ? discountValue : existingFull?.discountValue,
      listPrice,
    );
    updates.discountType = discountFields.discountType;
    updates.discountValue = discountFields.discountValue;
  } else if (price !== undefined) {
    const existingFull = await ProductVariant.findById(variantId)
      .select("discountType discountValue")
      .lean();
    const discountFields = normalizeVariantDiscountFields(
      existingFull?.discountType,
      existingFull?.discountValue,
      Number(price),
    );
    updates.discountType = discountFields.discountType;
    updates.discountValue = discountFields.discountValue;
  }
  if (status !== undefined) updates.status = Number(status);
  if (isNewArrival !== undefined) {
    updates.isNewArrival = normalizeIsNewArrival(isNewArrival);
  }
  const normalizedNextImages =
    images !== undefined ? normalizeVariantImages(images) : existingVariant.images || [];
  if (images !== undefined) updates.images = normalizedNextImages;

  let normalizedNextSizes;
  if (sizes !== undefined) {
    normalizedNextSizes = normalizeSizes(sizes);
    updates.sizes = normalizedNextSizes;
  }

  const normalizedRemovedPublicIds = Array.isArray(removedImagePublicIds)
    ? removedImagePublicIds
        .map((item) => normalizePublicId(item))
        .filter(Boolean)
    : [];
  const existingImageIds = (existingVariant.images || [])
    .map((image) => normalizePublicId(image?.publicId || image?.url || ""))
    .filter(Boolean);
  const nextImageIds = (normalizedNextImages || [])
    .map((image) => normalizePublicId(image?.publicId || image?.url || ""))
    .filter(Boolean);
  const removedByDiff = existingImageIds.filter((id) => !nextImageIds.includes(id));
  const finalDeleteIds = Array.from(
    new Set([...normalizedRemovedPublicIds, ...removedByDiff].filter(Boolean)),
  );
  await deleteMultipleFromR2(finalDeleteIds);

  const updatedDoc = await ProductVariant.findByIdAndUpdate(
    variantId,
    { $set: updates },
    { returnDocument: "after", runValidators: true },
  )
    .populate("productId", "name slug")
    .lean();

  const effectiveSizes = Array.isArray(updatedDoc?.sizes)
    ? updatedDoc.sizes
    : Array.isArray(existingVariant.sizes)
    ? existingVariant.sizes
    : [];
  if (effectiveSizes.length > 0) {
    // Per-size stock owns inventory; drop any legacy single-stock row to avoid double-counting.
    await Inventory.deleteOne({ productVariantId: variantId }).catch(() => null);
  } else if (stock !== undefined) {
    await upsertInventoryForVariant(variantId, stock);
  }
  if (updatedDoc.attributes instanceof Map) {
    updatedDoc.attributes = Object.fromEntries(updatedDoc.attributes);
  }
  if (effectiveSizes.length > 0) {
    updatedDoc.stock = computeVariantTotalStock({ sizes: effectiveSizes });
  } else {
    const inv = await Inventory.findOne({ productVariantId: variantId })
      .select("stock")
      .lean();
    updatedDoc.stock = Number(inv?.stock || 0);
  }
  return updatedDoc;
};

const deleteProductVariant = async (variantId) =>
  ProductVariant.findByIdAndDelete(variantId)
    .lean()
    .then(async (deleted) => {
      if (deleted?._id) {
        const imagePublicIds = (deleted.images || [])
          .map((image) => normalizePublicId(image?.publicId || image?.url || ""))
          .filter(Boolean);
        await deleteMultipleFromR2(imagePublicIds);
        await Inventory.findOneAndDelete({ productVariantId: deleted._id });
      }
      return deleted;
    });

const deleteVariantImage = async ({ variantId, publicId }) => {
  const normalizedPublicId = normalizePublicId(publicId);
  if (!normalizedPublicId) return { deleted: false };

  if (variantId && mongoose.Types.ObjectId.isValid(variantId)) {
    await ProductVariant.findByIdAndUpdate(variantId, {
      $pull: { images: { publicId: normalizedPublicId } },
    }).lean();
  }

  await deleteFileFromR2(normalizedPublicId);
  return { deleted: true, publicId: normalizedPublicId };
};

const deleteVariantImages = async ({ variantId, publicIds = [] }) => {
  const normalizedPublicIds = Array.from(
    new Set(
      (Array.isArray(publicIds) ? publicIds : [])
        .map((item) => normalizePublicId(item))
        .filter(Boolean),
    ),
  );
  if (normalizedPublicIds.length === 0) return { deleted: [] };

  if (variantId && mongoose.Types.ObjectId.isValid(variantId)) {
    await ProductVariant.findByIdAndUpdate(variantId, {
      $pull: { images: { publicId: { $in: normalizedPublicIds } } },
    }).lean();
  }

  await deleteMultipleFromR2(normalizedPublicIds);
  return { deleted: normalizedPublicIds };
};

const { bulkCreateProductVariants } = require("./productVariantBulk");

const isSkuTaken = async (sku, excludeId = null) => {
  const normalizedSku = normalizeSku(sku);
  const query = excludeId
    ? { sku: normalizedSku, _id: { $ne: excludeId } }
    : { sku: normalizedSku };
  const existing = await ProductVariant.findOne(query).select("_id").lean();
  return Boolean(existing);
};

module.exports = {
  buildListInput,
  getProductVariantsList,
  getProductVariantsOverview,
  getProductVariantById,
  getVariantsByProductId,
  createProductVariant,
  bulkCreateProductVariants,
  updateProductVariant,
  deleteProductVariant,
  deleteVariantImage,
  deleteVariantImages,
  uploadVariantImageFile,
  uploadVariantImageFiles,
  isSkuTaken,
  normalizeSku,
};
