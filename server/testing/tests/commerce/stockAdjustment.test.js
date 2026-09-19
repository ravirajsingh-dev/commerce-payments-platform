const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Admin = require("../../../models/Admin");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const StockAdjustment = require("../../../models/StockAdjustment");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const inventoryService = require("../../../modules/commerce/inventory/inventoryService");
const stockAdjustment = require("../../../modules/commerce/inventory/stockAdjustment");
const { INVENTORY_ERROR } = inventoryService;

describe("stock adjustment API (Phase 54)", () => {
  let mongoServer;
  let adminId;
  let legacyVariantId;
  let sizedVariantId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-stock-adjustment-tests",
    });

    const admin = await Admin.create({
      name: "Stock Admin",
      email: "stock-admin@example.com",
      password: "hashed-placeholder",
      txn_password: "hashed-placeholder",
      status: 1,
    });
    adminId = String(admin._id);

    const category = await Category.create({
      name: "Sherwanis",
      slug: "sherwanis-adjust",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-adjust",
      status: 1,
    });
    const product = await Product.create({
      name: "Adjust Sherwani",
      slug: "adjust-sherwani",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });

    const legacyVariant = await ProductVariant.create({
      productId: product._id,
      sku: "ADJ-LEGACY-01",
      attributes: { color: "gold" },
      price: 2500,
      sizes: [],
    });
    legacyVariantId = String(legacyVariant._id);
    await Inventory.create({
      productVariantId: legacyVariant._id,
      stock: 10,
    });

    const sizedVariant = await ProductVariant.create({
      productId: product._id,
      sku: "ADJ-SIZED-01",
      attributes: { color: "maroon" },
      price: 3000,
      sizes: [
        { value: "m", label: "M", stock: 5 },
        { value: "l", label: "L", stock: 8 },
      ],
    });
    sizedVariantId = String(sizedVariant._id);
  });

  afterEach(async () => {
    await StockAdjustment.deleteMany({});
    await Inventory.updateOne(
      { productVariantId: legacyVariantId },
      { $set: { stock: 10 } },
    );
    await ProductVariant.updateOne(
      { _id: sizedVariantId },
      {
        $set: {
          "sizes.0.stock": 5,
          "sizes.1.stock": 8,
        },
      },
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("adjustStock increases and decreases legacy stock", async () => {
    const added = await inventoryService.adjustStock(legacyVariantId, { delta: 3 });
    expect(added).toMatchObject({
      mode: "legacy",
      delta: 3,
      stockBefore: 10,
      stockAfter: 13,
    });

    const removed = await inventoryService.adjustStock(legacyVariantId, { delta: -5 });
    expect(removed).toMatchObject({
      stockBefore: 13,
      stockAfter: 8,
    });
  });

  it("adjustStock updates sized variant stock", async () => {
    const result = await inventoryService.adjustStock(sizedVariantId, {
      size: "m",
      delta: -2,
    });
    expect(result).toMatchObject({
      mode: "sized",
      size: "m",
      stockBefore: 5,
      stockAfter: 3,
    });
  });

  it("rejects adjustment that would oversell", async () => {
    await expect(
      inventoryService.adjustStock(legacyVariantId, { delta: -100 }),
    ).rejects.toMatchObject({ code: INVENTORY_ERROR.INSUFFICIENT_STOCK });
  });

  it("creates audit row and updates inventory", async () => {
    const result = await stockAdjustment.createStockAdjustment({
      variantId: legacyVariantId,
      delta: -4,
      reason: "damage",
      adminId,
    });

    expect(result.ok).toBe(true);
    expect(result.adjustment).toMatchObject({
      variantId: legacyVariantId,
      sku: "ADJ-LEGACY-01",
      delta: -4,
      reason: "damage",
      stockBefore: 10,
      stockAfter: 6,
      adminId,
    });

    const inventory = await Inventory.findOne({
      productVariantId: legacyVariantId,
    }).lean();
    expect(inventory.stock).toBe(6);

    const auditCount = await StockAdjustment.countDocuments({
      variantId: legacyVariantId,
    });
    expect(auditCount).toBe(1);
  });

  it("lists adjustments with pagination and sku filter", async () => {
    await stockAdjustment.createStockAdjustment({
      variantId: legacyVariantId,
      delta: 2,
      reason: "receiving",
      adminId,
    });
    await stockAdjustment.createStockAdjustment({
      variantId: sizedVariantId,
      size: "l",
      delta: 1,
      reason: "correction",
      adminId,
    });

    const all = await stockAdjustment.listStockAdjustments({ limit: 10 });
    expect(all.ok).toBe(true);
    expect(all.adjustments).toHaveLength(2);
    expect(all.pagination.total).toBe(2);

    const filtered = await stockAdjustment.listStockAdjustments({
      sku: "ADJ-LEGACY-01",
    });
    expect(filtered.adjustments).toHaveLength(1);
    expect(filtered.adjustments[0].sku).toBe("ADJ-LEGACY-01");
  });

  it("rejects invalid reason", async () => {
    const result = await stockAdjustment.createStockAdjustment({
      variantId: legacyVariantId,
      delta: 1,
      reason: "unknown_reason",
      adminId,
    });
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(400);
  });
});
