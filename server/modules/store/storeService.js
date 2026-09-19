const mongoose = require("mongoose");

const Product = require("../../models/Product");
const ProductVariant = require("../../models/ProductVariant");
const {
  enrichVariantPricing,
  getVariantEffectivePrice,
} = require("../../utils/variantPricing");
const Category = require("../../models/Category");
const {
  buildStorefrontNavigation,
} = require("../admin/store-nav-section/storeNavSectionService");
const Attribute = require("../../models/Attribute");
const Inventory = require("../../models/Inventory");
const {
  sizeChartToPlain,
} = require("../admin/product/productSizeChartHelpers");
const {
  buildVariantSalesMap,
  compareVariantsByBestSelling,
  getVariantSalesStats,
} = require("../commerce/analytics/variantSalesService");
const { parseCatalogSearchQuery } = require("./catalogFilters");

const ACTIVE_STATUS = 1;

const ALLOWED_COLLECTION_SORTS = new Set([
  "featured",
  "best-selling",
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
  "date-new",
  "date-old",
]);

const normalizeCollectionSort = (sort) => {
  const key = String(sort || "")
    .trim()
    .toLowerCase();
  return ALLOWED_COLLECTION_SORTS.has(key) ? key : "featured";
};

const variantMongoSort = (sortKey) => {
  switch (sortKey) {
    case "name-asc":
      return { name: 1, price: 1, createdAt: 1 };
    case "name-desc":
      return { name: -1, price: 1, createdAt: 1 };
    case "price-desc":
      return { price: -1, createdAt: 1 };
    case "date-new":
      return { createdAt: -1, price: 1 };
    case "date-old":
      return { createdAt: 1, price: 1 };
    case "best-selling":
    case "featured":
    default:
      return { price: 1, createdAt: 1 };
  }
};

const variantSortTitle = (variant) => String(variant?.name || "").trim() || "";

const variantSortTimestamp = (variant) => {
  const raw = variant?.createdAt || variant?.updatedAt;
  const ts = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ts) ? ts : 0;
};

const attachVariantSalesFields = (variant, salesMap) => {
  if (!salesMap) return variant;
  const stats = getVariantSalesStats(variant._id, salesMap);
  return {
    ...variant,
    unitsSold: stats.unitsSold,
    salesRevenue: stats.revenue,
  };
};

const sortDecoratedVariants = (variants, sortKey, salesMap = null) => {
  const list = [...variants];
  const key = sortKey || "featured";

  if (key === "featured") return list;

  if (key === "best-selling") {
    const map = salesMap || new Map();
    return list.sort((a, b) =>
      compareVariantsByBestSelling(a, b, map, variantSortTitle),
    );
  }

  if (key === "name-asc" || key === "name-desc") {
    const dir = key === "name-asc" ? 1 : -1;
    return list.sort(
      (a, b) =>
        dir *
        variantSortTitle(a).localeCompare(variantSortTitle(b), undefined, {
          sensitivity: "base",
        }),
    );
  }

  if (key === "price-asc" || key === "price-desc") {
    const dir = key === "price-asc" ? 1 : -1;
    return list.sort((a, b) => {
      const priceA = getVariantEffectivePrice(a);
      const priceB = getVariantEffectivePrice(b);
      if (priceA !== priceB) return dir * (priceA - priceB);
      return variantSortTitle(a).localeCompare(variantSortTitle(b), undefined, {
        sensitivity: "base",
      });
    });
  }

  if (key === "date-new" || key === "date-old") {
    const dir = key === "date-new" ? -1 : 1;
    return list.sort((a, b) => {
      const tsA = variantSortTimestamp(a);
      const tsB = variantSortTimestamp(b);
      if (tsA !== tsB) return dir * (tsA - tsB);
      return variantSortTitle(a).localeCompare(variantSortTitle(b), undefined, {
        sensitivity: "base",
      });
    });
  }

  return list;
};

const normalizeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Max query length forwarded to Mongo regex (cheap abuse guard). */
const STOREFRONT_SEARCH_MAX_LEN = 160;

const normalizeSizeRow = (row) => ({
  value: String(row?.value || "").toLowerCase(),
  label: String(row?.label || row?.value || "").trim(),
  sku: String(row?.sku || "").trim(),
  stock: Math.max(0, Number(row?.stock) || 0),
  description: String(row?.description ?? "").trim().slice(0, 500),
});

const variantToPlain = (variant) => {
  if (!variant) return null;
  const plain = typeof variant.toObject === "function" ? variant.toObject() : { ...variant };
  if (plain.attributes instanceof Map) {
    plain.attributes = Object.fromEntries(plain.attributes);
  }
  if (!Array.isArray(plain.images)) plain.images = [];
  if (typeof plain.name !== "string") plain.name = "";
  if (typeof plain.shortDescription !== "string") plain.shortDescription = "";
  plain.sizes = Array.isArray(plain.sizes)
    ? plain.sizes.map(normalizeSizeRow).filter((row) => row.value)
    : [];
  return enrichVariantPricing(plain);
};

const totalSizeStock = (sizes = []) =>
  sizes.reduce((sum, row) => sum + Math.max(0, Number(row?.stock) || 0), 0);

/** Resolves variant-attribute metadata for the product so the client can render labels/values. */
const fetchAttributeDefinitions = async (attributeSetId) => {
  if (!attributeSetId) return [];
  const definitions = await Attribute.find({
    attributeSetId,
    isActive: true,
  })
    .select("name code inputType isVariant options")
    .lean();
  return definitions || [];
};

const buildAttributeLabelMap = (definitions = []) => {
  const map = new Map();
  for (const def of definitions) {
    const code = String(def?.code || "").toLowerCase();
    if (!code) continue;
    const optionMap = new Map();
    for (const option of def?.options || []) {
      optionMap.set(String(option?.value || "").toLowerCase(), option?.label || option?.value || "");
    }
    map.set(code, {
      name: def?.name || code,
      isVariant: Boolean(def?.isVariant),
      optionMap,
    });
  }
  return map;
};

const decorateVariantWithLabels = (variant, attributeLabelMap) => {
  const attributes = variant?.attributes || {};
  const decorated = [];
  for (const [code, value] of Object.entries(attributes)) {
    const def = attributeLabelMap.get(String(code).toLowerCase());
    const label = def?.name || code;
    const valueLabel = def
      ? def.optionMap.get(String(value || "").toLowerCase()) || value || ""
      : value || "";
    decorated.push({
      code,
      label,
      value,
      valueLabel,
      isVariant: def?.isVariant !== false,
    });
  }
  return decorated;
};

/**
 * Builds a stable grouping key for variants so multiple sizes of the same "look"
 * fold into a single listing card. We prefer variant `name` (admin-set marketing
 * label). If empty, we fall back to a fingerprint of every non-size attribute,
 * keeping the grouping deterministic.
 */
const SIZE_ATTRIBUTE_CODES = new Set(["size", "sizes"]);

const buildGroupKey = (variant) => {
  const explicitName = String(variant?.name || "").trim().toLowerCase();
  if (explicitName) return `name:${explicitName}`;
  const entries = Object.entries(variant?.attributes || {})
    .filter(([code]) => !SIZE_ATTRIBUTE_CODES.has(String(code).toLowerCase()))
    .map(([code, value]) => [String(code).toLowerCase(), String(value || "").trim().toLowerCase()])
    .sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return `id:${String(variant?._id || "")}`;
  return `attrs:${entries.map(([k, v]) => `${k}=${v}`).join("|")}`;
};

const groupVariantsForListing = (variants = []) => {
  const groups = new Map();
  for (const variant of variants) {
    const key = buildGroupKey(variant);
    if (!groups.has(key)) {
      groups.set(key, {
        groupKey: key,
        name: String(variant.name || "").trim(),
        shortDescription: String(variant.shortDescription || "").trim(),
        coverImage: variant.images?.[0] || null,
        representativeVariantId: variant._id,
        minPrice: getVariantEffectivePrice(variant),
        maxPrice: getVariantEffectivePrice(variant),
        variants: [variant],
      });
      continue;
    }
    const group = groups.get(key);
    group.variants.push(variant);
    if (!group.coverImage && variant.images?.[0]) {
      group.coverImage = variant.images[0];
    }
    const price = getVariantEffectivePrice(variant);
    if (price < group.minPrice) {
      group.minPrice = price;
      group.representativeVariantId = variant._id;
    }
    if (price > group.maxPrice) group.maxPrice = price;
    if (!group.name && variant.name) group.name = variant.name.trim();
    if (!group.shortDescription && variant.shortDescription) {
      group.shortDescription = variant.shortDescription.trim();
    }
  }
  return Array.from(groups.values());
};

const productLeanToStorefrontSummary = (product) => ({
  _id: product._id,
  name: product.name,
  slug: product.slug,
  description: product.description || "",
  deliveryDescription: product.deliveryDescription || "",
  purchaseNote: product.purchaseNote || "",
  primaryCategory: product.primaryCategoryId || null,
  categories: product.categoryIds || [],
  seo: product.seo || {},
  sizeChart: sizeChartToPlain(product.sizeChart),
});

/**
 * Loads active variants for one product with stock + attributeList (shared by listing + detail views).
 * @param {object} productLean — `Product` lean doc (populated category fields as in storefront).
 */
const buildStorefrontProductPayload = async (
  productLean,
  { sort, salesMap: salesMapInput } = {},
) => {
  if (!productLean?._id) return null;

  const sortKey = normalizeCollectionSort(sort);
  const needsSalesMap =
    sortKey === "best-selling" || Boolean(salesMapInput);

  const [variantsRaw, attributeDefinitions, salesMap] = await Promise.all([
    ProductVariant.find({ productId: productLean._id, status: ACTIVE_STATUS })
      .sort(variantMongoSort(sortKey))
      .lean(),
    fetchAttributeDefinitions(productLean.attributeSetId),
    needsSalesMap
      ? salesMapInput || buildVariantSalesMap()
      : Promise.resolve(null),
  ]);

  const attributeLabelMap = buildAttributeLabelMap(attributeDefinitions);

  const legacyIds = (variantsRaw || [])
    .filter((row) => !Array.isArray(row.sizes) || row.sizes.length === 0)
    .map((row) => row._id);
  const inventoryRows = legacyIds.length
    ? await Inventory.find({ productVariantId: { $in: legacyIds } })
        .select("productVariantId stock")
        .lean()
    : [];
  const legacyStockMap = new Map(
    (inventoryRows || []).map((row) => [String(row.productVariantId), Number(row.stock || 0)]),
  );

  const variants = sortDecoratedVariants(
    (variantsRaw || []).map((variant) => {
      const plain = variantToPlain(variant);
      const stock =
        plain.sizes.length > 0
          ? totalSizeStock(plain.sizes)
          : legacyStockMap.get(String(plain._id)) || 0;
      return attachVariantSalesFields(
        {
          ...plain,
          stock,
          inStock: stock > 0,
          attributeList: decorateVariantWithLabels(plain, attributeLabelMap),
        },
        salesMap,
      );
    }),
    sortKey,
    salesMap,
  );

  return {
    productSummary: productLeanToStorefrontSummary(productLean),
    variants,
    attributeDefinitions,
    sort: sortKey,
  };
};

const fetchActiveProductBySlug = async (slug) => {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  return Product.findOne({ slug: normalized, status: ACTIVE_STATUS })
    .populate("primaryCategoryId", "name slug")
    .populate("categoryIds", "name slug")
    .lean();
};

/** Public listing — fetches an active product with all active variants for the collection page. */
const getProductBySlug = async (slug, { sort } = {}) => {
  const product = await fetchActiveProductBySlug(slug);
  if (!product) return null;

  const payload = await buildStorefrontProductPayload(product, { sort });
  if (!payload) return null;

  const groups = groupVariantsForListing(payload.variants);

  return {
    product: payload.productSummary,
    variants: payload.variants,
    sort: payload.sort,
    groups,
    variantAttributes: payload.attributeDefinitions
      .filter((def) => def?.isVariant)
      .map((def) => ({
        name: def.name,
        code: def.code,
        inputType: def.inputType,
        options: def.options || [],
      })),
  };
};

/** Storefront: product + flattened variants only (dedicated listing endpoint). */
const getProductVariantsBySlug = async (slug) => {
  const product = await fetchActiveProductBySlug(slug);
  if (!product) return null;

  const payload = await buildStorefrontProductPayload(product);
  if (!payload) return null;

  return {
    product: payload.productSummary,
    variants: payload.variants,
  };
};

/** Every active variant across the catalog with its product (for global “All variants” page). */
const listAllStorefrontVariants = async (_rawQuery = {}) => {
  const salesMap = await buildVariantSalesMap();
  const products = await Product.find({ status: ACTIVE_STATUS })
    .sort({ name: 1 })
    .populate("primaryCategoryId", "name slug")
    .populate("categoryIds", "name slug")
    .lean();

  const items = [];
  for (const product of products) {
    const payload = await buildStorefrontProductPayload(product, { salesMap });
    if (!payload?.variants?.length) continue;
    for (const variant of payload.variants) {
      items.push({
        product: payload.productSummary,
        variant,
      });
    }
  }

  return { items };
};

/** Active variants flagged as New Arrivals (admin-curated), with parent product summary. */
const listNewArrivalStorefrontVariants = async () => {
  const salesMap = await buildVariantSalesMap();
  const variantsRaw = await ProductVariant.find({
    isNewArrival: true,
    status: ACTIVE_STATUS,
  })
    .sort({ createdAt: -1, price: 1 })
    .lean();

  if (!variantsRaw.length) return { items: [] };

  const productIds = [
    ...new Set(
      variantsRaw
        .map((row) => row.productId)
        .filter((id) => mongoose.Types.ObjectId.isValid(id)),
    ),
  ];

  const products = await Product.find({
    _id: { $in: productIds },
    status: ACTIVE_STATUS,
  })
    .populate("primaryCategoryId", "name slug")
    .populate("categoryIds", "name slug")
    .lean();

  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const legacyIds = variantsRaw
    .filter((row) => !Array.isArray(row.sizes) || row.sizes.length === 0)
    .map((row) => row._id);
  const inventoryRows = legacyIds.length
    ? await Inventory.find({ productVariantId: { $in: legacyIds } })
        .select("productVariantId stock")
        .lean()
    : [];
  const legacyStockMap = new Map(
    (inventoryRows || []).map((row) => [String(row.productVariantId), Number(row.stock || 0)]),
  );

  const attributeLabelCache = new Map();
  const items = [];

  for (const variantRaw of variantsRaw) {
    const product = productMap.get(String(variantRaw.productId));
    if (!product) continue;

    const attrSetKey = String(product.attributeSetId || "");
    if (!attributeLabelCache.has(attrSetKey)) {
      const definitions = await fetchAttributeDefinitions(product.attributeSetId);
      attributeLabelCache.set(attrSetKey, buildAttributeLabelMap(definitions));
    }
    const attributeLabelMap = attributeLabelCache.get(attrSetKey);

    const plain = variantToPlain(variantRaw);
    const stock =
      plain.sizes.length > 0
        ? totalSizeStock(plain.sizes)
        : legacyStockMap.get(String(plain._id)) || 0;

    items.push({
      product: productLeanToStorefrontSummary(product),
      variant: attachVariantSalesFields(
        {
          ...plain,
          stock,
          inStock: stock > 0,
          attributeList: decorateVariantWithLabels(plain, attributeLabelMap),
        },
        salesMap,
      ),
    });
  }

  return { items };
};

/**
 * Storefront search — text match on product and variant names.
 * Payload shape matches `listAllStorefrontVariants` ({ items }) for reuse of listing UI.
 */
const searchStorefrontCatalog = async (rawQuery = {}) => {
  const parsed =
    typeof rawQuery === "string"
      ? parseCatalogSearchQuery({ q: rawQuery })
      : parseCatalogSearchQuery(rawQuery);

  const trimmed = parsed.q.slice(0, STOREFRONT_SEARCH_MAX_LEN);

  if (!trimmed) {
    return {
      ok: true,
      items: [],
      query: "",
    };
  }

  let productQuery = { status: ACTIVE_STATUS };

  if (trimmed) {
    const regex = escapeRegex(trimmed);
    const productIdsMatchingVariantName = await ProductVariant.distinct(
      "productId",
      {
        status: ACTIVE_STATUS,
        name: { $regex: regex, $options: "i" },
      },
    );

    productQuery = {
      status: ACTIVE_STATUS,
      ...(productIdsMatchingVariantName.length
        ? {
            $or: [
              { name: { $regex: regex, $options: "i" } },
              { _id: { $in: productIdsMatchingVariantName } },
            ],
          }
        : { name: { $regex: regex, $options: "i" } }),
    };
  }

  const salesMap = await buildVariantSalesMap();
  const products = await Product.find(productQuery)
    .sort({ name: 1 })
    .populate("primaryCategoryId", "name slug")
    .populate("categoryIds", "name slug")
    .lean();

  const items = [];
  for (const product of products) {
    const payload = await buildStorefrontProductPayload(product, { salesMap });
    if (!payload?.variants?.length) continue;
    for (const variant of payload.variants) {
      items.push({
        product: payload.productSummary,
        variant,
      });
    }
  }

  return {
    ok: true,
    items,
    query: trimmed,
  };
};

const RELATED_PRODUCT_LIMIT = 4;

const resolveGroupRepresentativeVariant = (variants, group) =>
  variants.find(
    (row) => String(row._id) === String(group.representativeVariantId),
  ) || variants[0] || null;

/**
 * Adds listing cards from variant groups (one card per "look", not one per product).
 */
const pushRelatedGroupsFromVariants = (
  items,
  seenVariantIds,
  productSummary,
  variants,
  { skipGroupKey = "", skipProductId = "" } = {},
) => {
  if (!productSummary?.slug || !Array.isArray(variants) || !variants.length) {
    return;
  }

  const groups = groupVariantsForListing(variants);
  for (const group of groups) {
    if (items.length >= RELATED_PRODUCT_LIMIT) return;

    const sameProduct =
      skipProductId && String(productSummary._id) === String(skipProductId);
    if (sameProduct && skipGroupKey && group.groupKey === skipGroupKey) {
      continue;
    }

    const variant = resolveGroupRepresentativeVariant(variants, group);
    const variantId = variant?._id != null ? String(variant._id) : "";
    if (!variantId || seenVariantIds.has(variantId)) continue;

    seenVariantIds.add(variantId);
    items.push({
      product: productSummary,
      variant,
    });
  }
};

const appendRelatedFromProducts = async (
  products,
  items,
  seenVariantIds,
  salesMap,
  options = {},
) => {
  const payloadCache = new Map();

  for (const product of products) {
    if (items.length >= RELATED_PRODUCT_LIMIT) return;

    const productKey = String(product._id);
    let payload = payloadCache.get(productKey);
    if (!payload) {
      payload = await buildStorefrontProductPayload(product, {
        salesMap,
        sort: "best-selling",
      });
      payloadCache.set(productKey, payload);
    }
    if (!payload?.variants?.length) continue;

    pushRelatedGroupsFromVariants(
      items,
      seenVariantIds,
      payload.productSummary,
      payload.variants,
      options,
    );
  }
};

/**
 * PDP related cards (max 4 variant "looks"):
 * 1) Other looks on the same product (sibling variant groups)
 * 2) Other products in the same category/categories
 * 3) Remaining active catalog (all products)
 * 4) Direct variant scan if still short
 */
const listRelatedStorefrontVariants = async ({
  productId,
  variantId,
  primaryCategoryId,
  categoryIds = [],
  currentProductSummary = null,
  siblingVariants = [],
  currentGroupKey = "",
}) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) return [];

  const items = [];
  const seenVariantIds = new Set(
    [variantId].filter((id) => id != null).map((id) => String(id)),
  );
  const excludeProductId = new mongoose.Types.ObjectId(productId);

  if (currentProductSummary && siblingVariants.length) {
    pushRelatedGroupsFromVariants(
      items,
      seenVariantIds,
      currentProductSummary,
      siblingVariants,
      {
        skipGroupKey: currentGroupKey,
        skipProductId: String(productId),
      },
    );
  }

  const categoryObjectIds = [primaryCategoryId, ...(categoryIds || [])]
    .map((row) => (row?._id != null ? row._id : row))
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const uniqueCategoryIds = [
    ...new Set(categoryObjectIds.map((id) => String(id))),
  ].map((id) => new mongoose.Types.ObjectId(id));

  const salesMap = await buildVariantSalesMap();
  const productPopulate = [
    { path: "primaryCategoryId", select: "name slug" },
    { path: "categoryIds", select: "name slug" },
  ];

  if (uniqueCategoryIds.length) {
    const categoryProducts = await Product.find({
      status: ACTIVE_STATUS,
      _id: { $ne: excludeProductId },
      $or: uniqueCategoryIds.flatMap((catId) => [
        { primaryCategoryId: catId },
        { categoryIds: catId },
      ]),
    })
      .sort({ name: 1 })
      .limit(40)
      .populate(productPopulate)
      .lean();

    await appendRelatedFromProducts(
      categoryProducts,
      items,
      seenVariantIds,
      salesMap,
    );
  }

  if (items.length < RELATED_PRODUCT_LIMIT) {
    const excludeProductIds = [
      String(productId),
      ...items.map((row) => String(row.product?._id || "")),
    ]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const catalogProducts = await Product.find({
      status: ACTIVE_STATUS,
      _id: { $nin: excludeProductIds },
    })
      .sort({ name: 1 })
      .limit(50)
      .populate(productPopulate)
      .lean();

    await appendRelatedFromProducts(
      catalogProducts,
      items,
      seenVariantIds,
      salesMap,
    );
  }

  if (items.length < RELATED_PRODUCT_LIMIT) {
    const excludeVariantObjectIds = [...seenVariantIds]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const variantDocs = await ProductVariant.find({
      status: ACTIVE_STATUS,
      _id: { $nin: excludeVariantObjectIds },
    })
      .sort({ createdAt: -1, price: 1 })
      .limit(80)
      .lean();

    const productIds = [
      ...new Set(
        variantDocs
          .map((row) => row.productId)
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => String(id)),
      ),
    ].map((id) => new mongoose.Types.ObjectId(id));

    if (productIds.length) {
      const products = await Product.find({
        _id: { $in: productIds },
        status: ACTIVE_STATUS,
      })
        .populate(productPopulate)
        .lean();

      const productById = new Map(products.map((row) => [String(row._id), row]));
      const payloadCache = new Map();

      for (const variantDoc of variantDocs) {
        if (items.length >= RELATED_PRODUCT_LIMIT) break;

        const variantKey = String(variantDoc._id);
        if (seenVariantIds.has(variantKey)) continue;

        const product = productById.get(String(variantDoc.productId));
        if (!product) continue;

        const productKey = String(product._id);
        let payload = payloadCache.get(productKey);
        if (!payload) {
          payload = await buildStorefrontProductPayload(product, {
            salesMap,
            sort: "best-selling",
          });
          payloadCache.set(productKey, payload);
        }

        const variant = payload?.variants?.find(
          (row) => String(row._id) === variantKey,
        );
        if (!variant || !payload?.productSummary?.slug) continue;

        seenVariantIds.add(variantKey);
        items.push({
          product: payload.productSummary,
          variant,
        });
      }
    }
  }

  return items;
};

/** Public detail — fetches the selected variant plus its sibling variants so the storefront can render size pickers. */
const getVariantById = async (variantId) => {
  if (!mongoose.Types.ObjectId.isValid(variantId)) return null;

  const variantDoc = await ProductVariant.findOne({
    _id: variantId,
    status: ACTIVE_STATUS,
  })
    .populate({
      path: "productId",
      select:
        "name slug description deliveryDescription purchaseNote status attributeSetId primaryCategoryId categoryIds seo sizeChart",
      populate: [
        { path: "primaryCategoryId", select: "name slug" },
        { path: "categoryIds", select: "name slug" },
      ],
    })
    .lean();

  if (!variantDoc || !variantDoc.productId) return null;
  if (Number(variantDoc.productId.status) !== ACTIVE_STATUS) return null;

  const product = variantDoc.productId;
  const selectedPlain = variantToPlain(variantDoc);

  const [siblingsRaw, attributeDefinitions] = await Promise.all([
    ProductVariant.find({ productId: product._id, status: ACTIVE_STATUS })
      .sort({ price: 1, createdAt: 1 })
      .lean(),
    fetchAttributeDefinitions(product.attributeSetId),
  ]);

  // Inventory rows are only relevant for legacy size-less variants.
  const legacyIds = (siblingsRaw || [])
    .filter((row) => !Array.isArray(row.sizes) || row.sizes.length === 0)
    .map((row) => row._id);
  const inventoryRows = legacyIds.length
    ? await Inventory.find({ productVariantId: { $in: legacyIds } })
        .select("productVariantId stock")
        .lean()
    : [];

  const attributeLabelMap = buildAttributeLabelMap(attributeDefinitions);
  const legacyStockMap = new Map(
    (inventoryRows || []).map((row) => [
      String(row.productVariantId),
      Number(row.stock || 0),
    ]),
  );

  const decorate = (row) => {
    const plain = variantToPlain(row);
    const stock =
      plain.sizes.length > 0
        ? totalSizeStock(plain.sizes)
        : legacyStockMap.get(String(plain._id)) || 0;
    return {
      ...plain,
      stock,
      inStock: stock > 0,
      attributeList: decorateVariantWithLabels(plain, attributeLabelMap),
    };
  };

  const siblings = (siblingsRaw || []).map(decorate);

  const selectedKey = buildGroupKey(selectedPlain);
  const groupVariants = siblings.filter(
    (sibling) => buildGroupKey(sibling) === selectedKey,
  );

  const selectedDecorated = decorate(variantDoc);

  const currentProductSummary = productLeanToStorefrontSummary(product);

  const relatedProducts = await listRelatedStorefrontVariants({
    productId: product._id,
    variantId: variantDoc._id,
    primaryCategoryId: product.primaryCategoryId?._id || product.primaryCategoryId,
    categoryIds: product.categoryIds || [],
    currentProductSummary,
    siblingVariants: siblings,
    currentGroupKey: selectedKey,
  });

  return {
    variant: selectedDecorated,
    groupVariants,
    siblings,
    product: {
      _id: product._id,
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      deliveryDescription: product.deliveryDescription || "",
      purchaseNote: product.purchaseNote || "",
      primaryCategory: product.primaryCategoryId || null,
      categories: product.categoryIds || [],
      seo: product.seo || {},
      sizeChart: sizeChartToPlain(product.sizeChart),
    },
    variantAttributes: attributeDefinitions
      .filter((def) => def?.isVariant)
      .map((def) => ({
        name: def.name,
        code: def.code,
        inputType: def.inputType,
        options: def.options || [],
      })),
    relatedProducts,
  };
};

/** Storefront catalog — all active products with variant counts and a cover thumbnail. */
const listCatalogProducts = async () => {
  const products = await Product.find({ status: ACTIVE_STATUS })
    .sort({ name: 1 })
    .select("name slug")
    .lean();

  if (!products.length) {
    return { products: [] };
  }

  const productIds = products.map((p) => p._id);

  const variantRows = await ProductVariant.aggregate([
    { $match: { productId: { $in: productIds }, status: ACTIVE_STATUS } },
    {
      $addFields: {
        thumb: { $arrayElemAt: ["$images", 0] },
      },
    },
    { $sort: { productId: 1, price: 1, createdAt: 1 } },
    {
      $group: {
        _id: "$productId",
        variantCount: { $sum: 1 },
        thumbnails: { $push: "$thumb" },
      },
    },
    {
      $project: {
        variantCount: 1,
        cover: {
          $let: {
            vars: {
              filtered: {
                $filter: {
                  input: "$thumbnails",
                  as: "t",
                  cond: {
                    $and: [
                      { $ne: ["$$t", null] },
                      {
                        $gt: [
                          {
                            $strLenCP: {
                              $ifNull: ["$$t.url", ""],
                            },
                          },
                          0,
                        ],
                      },
                    ],
                  },
                },
              },
            },
            in: { $arrayElemAt: ["$$filtered", 0] },
          },
        },
      },
    },
  ]);

  const byProductId = new Map(
    (variantRows || []).map((row) => [String(row._id), row]),
  );

  const catalog = products.map((p) => {
    const row = byProductId.get(String(p._id));
    const variantCount = row?.variantCount ?? 0;
    const cover = row?.cover;
    const coverImage =
      cover && cover.url
        ? {
            url: String(cover.url).trim(),
            publicId: String(cover.publicId || "").trim(),
          }
        : null;

    return {
      name: p.name,
      slug: p.slug,
      variantCount,
      coverImage,
    };
  });

  return { products: catalog };
};

/** Storefront mega-menu — admin-configured headings + product assignments. */
const getStoreNavigation = async () => buildStorefrontNavigation();

const fetchActiveCategoryBySlug = async (slug) => {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  return Category.findOne({ slug: normalized, status: ACTIVE_STATUS })
    .select("name slug")
    .lean();
};

/** Active categories for footer and other storefront navigation. */
const listStorefrontCategories = async () => {
  const categories = await Category.find({ status: ACTIVE_STATUS })
    .sort({ sortOrder: 1, name: 1 })
    .select("name slug")
    .lean();

  return {
    categories: (categories || []).map((row) => ({
      name: String(row.name || "").trim(),
      slug: String(row.slug || "").trim(),
    })),
  };
};

/** All published variants for products mapped to the given category slug. */
const listStorefrontVariantsByCategorySlug = async (slug, _rawQuery = {}) => {
  const category = await fetchActiveCategoryBySlug(slug);
  if (!category) return null;

  const categoryId = category._id;
  const salesMap = await buildVariantSalesMap();
  const products = await Product.find({
    status: ACTIVE_STATUS,
    $or: [{ primaryCategoryId: categoryId }, { categoryIds: categoryId }],
  })
    .sort({ name: 1 })
    .populate("primaryCategoryId", "name slug")
    .populate("categoryIds", "name slug")
    .lean();

  const items = [];
  for (const product of products) {
    const payload = await buildStorefrontProductPayload(product, { salesMap });
    if (!payload?.variants?.length) continue;
    for (const variant of payload.variants) {
      items.push({
        product: payload.productSummary,
        variant,
      });
    }
  }

  return {
    category: {
      name: String(category.name || "").trim(),
      slug: String(category.slug || "").trim(),
    },
    items,
  };
};

module.exports = {
  getProductBySlug,
  getProductVariantsBySlug,
  getVariantById,
  listAllStorefrontVariants,
  listNewArrivalStorefrontVariants,
  searchStorefrontCatalog,
  listCatalogProducts,
  getStoreNavigation,
  listStorefrontCategories,
  listStorefrontVariantsByCategorySlug,
};
