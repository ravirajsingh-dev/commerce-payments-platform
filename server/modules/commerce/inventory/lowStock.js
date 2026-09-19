const CommonSettings = require("../../../models/CommonSettings");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const AdminNotification = require("../../../models/AdminNotification");

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

const normalizeThreshold = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_LOW_STOCK_THRESHOLD;
  }
  return Math.floor(parsed);
};

const getLowStockThreshold = async () => {
  const settings = await CommonSettings.getOrCreateSettings();
  return normalizeThreshold(settings.lowStockThreshold);
};

const buildDedupeKey = (variantId, size = "") =>
  `${String(variantId)}:${String(size || "").trim().toLowerCase()}`;

const mapSizedLowStockRows = (variant, threshold) => {
  const product = variant.productId;
  const productId =
    product && typeof product === "object" ? String(product._id) : String(product || "");
  const productName =
    product && typeof product === "object" ? product.name || "" : "";

  const rows = [];
  for (const sizeRow of variant.sizes || []) {
    const stock = Math.max(0, Number(sizeRow.stock) || 0);
    if (stock > threshold) continue;

    const size = String(sizeRow.value || "").trim().toLowerCase();
    rows.push({
      variantId: String(variant._id),
      productId,
      productName,
      variantName: variant.name || "",
      sku: variant.sku || "",
      size,
      sizeLabel: sizeRow.label || sizeRow.value || size,
      stock,
      threshold,
      mode: "sized",
      dedupeKey: buildDedupeKey(variant._id, size),
    });
  }
  return rows;
};

const mapLegacyLowStockRow = (variant, stock, threshold) => {
  const product = variant.productId;
  const productId =
    product && typeof product === "object" ? String(product._id) : String(product || "");
  const productName =
    product && typeof product === "object" ? product.name || "" : "";

  return {
    variantId: String(variant._id),
    productId,
    productName,
    variantName: variant.name || "",
    sku: variant.sku || "",
    size: null,
    sizeLabel: null,
    stock,
    threshold,
    mode: "legacy",
    dedupeKey: buildDedupeKey(variant._id),
  };
};

/**
 * Lists SKU/size rows at or below the configured low-stock threshold.
 */
const listLowStock = async (options = {}) => {
  const threshold =
    options.threshold !== undefined
      ? normalizeThreshold(options.threshold)
      : await getLowStockThreshold();
  const includeInactive = options.includeInactive === true;
  const syncNotifications = options.syncNotifications !== false;

  const variantFilter = includeInactive ? {} : { status: 1 };
  const items = [];

  const sizedVariants = await ProductVariant.find({
    ...variantFilter,
    "sizes.0": { $exists: true },
    sizes: { $elemMatch: { stock: { $lte: threshold } } },
  })
    .select("sku name productId sizes status")
    .populate("productId", "name slug")
    .lean();

  for (const variant of sizedVariants) {
    items.push(...mapSizedLowStockRows(variant, threshold));
  }

  const legacyVariants = await ProductVariant.find({
    ...variantFilter,
    $or: [{ sizes: { $size: 0 } }, { sizes: { $exists: false } }],
  })
    .select("sku name productId status")
    .populate("productId", "name slug")
    .lean();

  if (legacyVariants.length > 0) {
    const legacyIds = legacyVariants.map((v) => v._id);
    const inventoryRows = await Inventory.find({
      productVariantId: { $in: legacyIds },
    })
      .select("productVariantId stock")
      .lean();

    const stockByVariantId = new Map(
      inventoryRows.map((row) => [
        String(row.productVariantId),
        Math.max(0, Number(row.stock) || 0),
      ]),
    );

    for (const variant of legacyVariants) {
      const stock = stockByVariantId.has(String(variant._id))
        ? stockByVariantId.get(String(variant._id))
        : 0;
      if (stock > threshold) continue;
      items.push(mapLegacyLowStockRow(variant, stock, threshold));
    }
  }

  items.sort(
    (a, b) =>
      a.stock - b.stock ||
      String(a.sku).localeCompare(String(b.sku)) ||
      String(a.size || "").localeCompare(String(b.size || "")),
  );

  let notificationSummary = null;
  if (syncNotifications) {
    notificationSummary = await syncLowStockNotifications(items, threshold);
  }

  return {
    ok: true,
    threshold,
    items,
    total: items.length,
    notificationSummary,
  };
};

/**
 * Upserts active low-stock notification rows and deactivates stale ones.
 */
const syncLowStockNotifications = async (items, threshold) => {
  const activeKeys = new Set(items.map((item) => item.dedupeKey));
  const now = new Date();

  for (const item of items) {
    await AdminNotification.findOneAndUpdate(
      { type: "low_stock", dedupeKey: item.dedupeKey },
      {
        $set: {
          type: "low_stock",
          dedupeKey: item.dedupeKey,
          variantId: item.variantId,
          productId: item.productId || undefined,
          sku: item.sku,
          productName: item.productName,
          variantName: item.variantName,
          size: item.size || "",
          sizeLabel: item.sizeLabel || "",
          stock: item.stock,
          threshold,
          active: true,
          dismissedAt: null,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
  }

  const deactivateResult = await AdminNotification.updateMany(
    {
      type: "low_stock",
      active: true,
      dedupeKey: { $nin: Array.from(activeKeys) },
    },
    { $set: { active: false } },
  );

  const activeCount = await AdminNotification.countDocuments({
    type: "low_stock",
    active: true,
  });

  return {
    synced: items.length,
    deactivated: deactivateResult.modifiedCount || 0,
    activeCount,
  };
};

module.exports = {
  DEFAULT_LOW_STOCK_THRESHOLD,
  normalizeThreshold,
  getLowStockThreshold,
  listLowStock,
  syncLowStockNotifications,
};
