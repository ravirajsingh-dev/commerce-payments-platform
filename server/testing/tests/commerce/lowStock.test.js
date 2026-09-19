const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const CommonSettings = require("../../../models/CommonSettings");
const AdminNotification = require("../../../models/AdminNotification");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const lowStock = require("../../../modules/commerce/inventory/lowStock");

describe("low stock alerts (Phase 53)", () => {
  let mongoServer;
  let legacyVariantId;
  let sizedVariantId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-low-stock-tests",
    });

    await CommonSettings.getOrCreateSettings();
    await CommonSettings.updateOne({}, { $set: { lowStockThreshold: 5 } });

    const category = await Category.create({
      name: "Sherwanis",
      slug: "sherwanis-low-stock",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-low-stock",
      status: 1,
    });
    const product = await Product.create({
      name: "Low Stock Sherwani",
      slug: "low-stock-sherwani",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });

    const legacyVariant = await ProductVariant.create({
      productId: product._id,
      sku: "LOW-LEGACY-01",
      attributes: { color: "gold" },
      price: 2500,
      sizes: [],
    });
    legacyVariantId = String(legacyVariant._id);
    await Inventory.create({
      productVariantId: legacyVariant._id,
      stock: 3,
    });

    const sizedVariant = await ProductVariant.create({
      productId: product._id,
      sku: "LOW-SIZED-01",
      attributes: { color: "maroon" },
      price: 3000,
      sizes: [
        { value: "m", label: "M", stock: 2 },
        { value: "l", label: "L", stock: 12 },
      ],
    });
    sizedVariantId = String(sizedVariant._id);
  });

  afterEach(async () => {
    await AdminNotification.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("reads threshold from CommonSettings", async () => {
    const threshold = await lowStock.getLowStockThreshold();
    expect(threshold).toBe(5);
  });

  it("lists legacy and sized rows at or below threshold", async () => {
    const result = await lowStock.listLowStock({ syncNotifications: false });

    expect(result.ok).toBe(true);
    expect(result.threshold).toBe(5);
    expect(result.total).toBe(2);

    const legacyRow = result.items.find((row) => row.variantId === legacyVariantId);
    expect(legacyRow).toMatchObject({
      sku: "LOW-LEGACY-01",
      productName: "Low Stock Sherwani",
      stock: 3,
      mode: "legacy",
    });

    const sizedRow = result.items.find(
      (row) => row.variantId === sizedVariantId && row.size === "m",
    );
    expect(sizedRow).toMatchObject({
      sku: "LOW-SIZED-01",
      sizeLabel: "M",
      stock: 2,
      mode: "sized",
    });

    const sizedOk = result.items.find(
      (row) => row.variantId === sizedVariantId && row.size === "l",
    );
    expect(sizedOk).toBeUndefined();
  });

  it("syncs optional admin notification rows", async () => {
    const result = await lowStock.listLowStock({ syncNotifications: true });

    expect(result.notificationSummary).toMatchObject({
      synced: 2,
      activeCount: 2,
    });

    const notifications = await AdminNotification.find({ type: "low_stock", active: true })
      .sort({ sku: 1 })
      .lean();
    expect(notifications).toHaveLength(2);
    expect(notifications[0].dedupeKey).toContain(legacyVariantId);
    expect(notifications[1].stock).toBeLessThanOrEqual(5);
  });

  it("deactivates notifications when stock is no longer low", async () => {
    await lowStock.listLowStock({ syncNotifications: true });
    await Inventory.updateOne(
      { productVariantId: legacyVariantId },
      { $set: { stock: 50 } },
    );

    const result = await lowStock.listLowStock({ syncNotifications: true });
    expect(result.total).toBe(1);
    expect(result.notificationSummary.deactivated).toBeGreaterThanOrEqual(1);

    const legacyNotification = await AdminNotification.findOne({
      dedupeKey: `${legacyVariantId}:`,
    }).lean();
    expect(legacyNotification.active).toBe(false);
  });
});
