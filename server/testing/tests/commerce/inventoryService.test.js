const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const inventoryService = require("../../../modules/commerce/inventory/inventoryService");
const { INVENTORY_ERROR } = inventoryService;

describe("inventoryService (Phase 7)", () => {
  let mongoServer;
  let productId;
  let legacyVariantId;
  let sizedVariantId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-inventory-service-tests",
    });

    const category = await Category.create({
      name: "Kurtas",
      slug: "kurtas",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel",
      status: 1,
    });
    const product = await Product.create({
      name: "Test Kurta",
      slug: "test-kurta",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });
    productId = product._id;

    const legacyVariant = await ProductVariant.create({
      productId,
      sku: "LEGACY-01",
      attributes: { color: "red" },
      price: 1000,
      sizes: [],
    });
    legacyVariantId = legacyVariant._id;
    await Inventory.create({
      productVariantId: legacyVariantId,
      stock: 10,
    });

    const sizedVariant = await ProductVariant.create({
      productId,
      sku: "SIZED-01",
      attributes: { color: "blue" },
      price: 1200,
      sizes: [
        { value: "s", label: "S", stock: 3 },
        { value: "m", label: "M", stock: 5 },
      ],
    });
    sizedVariantId = sizedVariant._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("getAvailableStock", () => {
    it("reads legacy Inventory when variant has no sizes", async () => {
      const result = await inventoryService.getAvailableStock(legacyVariantId);

      expect(result).toEqual({
        variantId: String(legacyVariantId),
        mode: "legacy",
        size: null,
        available: 10,
      });
    });

    it("reads per-size stock when variant has sizes", async () => {
      const result = await inventoryService.getAvailableStock(sizedVariantId, "m");

      expect(result).toEqual({
        variantId: String(sizedVariantId),
        mode: "sized",
        size: "m",
        available: 5,
      });
    });

    it("normalizes size value case", async () => {
      const result = await inventoryService.getAvailableStock(sizedVariantId, "M");
      expect(result.size).toBe("m");
      expect(result.available).toBe(5);
    });

    it("requires size for sized variants", async () => {
      await expect(
        inventoryService.getAvailableStock(sizedVariantId),
      ).rejects.toMatchObject({ code: INVENTORY_ERROR.SIZE_REQUIRED });
    });

    it("rejects size on legacy variants", async () => {
      await expect(
        inventoryService.getAvailableStock(legacyVariantId, "m"),
      ).rejects.toMatchObject({ code: INVENTORY_ERROR.SIZE_NOT_ALLOWED });
    });
  });

  describe("decrementStock", () => {
    it("decrements legacy inventory atomically", async () => {
      const result = await inventoryService.decrementStock(legacyVariantId, {
        qty: 4,
      });

      expect(result).toMatchObject({
        mode: "legacy",
        available: 6,
        decremented: 4,
      });

      const after = await inventoryService.getAvailableStock(legacyVariantId);
      expect(after.available).toBe(6);
    });

    it("decrements only the requested size row", async () => {
      const result = await inventoryService.decrementStock(sizedVariantId, {
        size: "s",
        qty: 2,
      });

      expect(result).toMatchObject({
        mode: "sized",
        size: "s",
        available: 1,
        decremented: 2,
      });

      const otherSize = await inventoryService.getAvailableStock(
        sizedVariantId,
        "m",
      );
      expect(otherSize.available).toBe(5);
    });

    it("fails when legacy stock is insufficient", async () => {
      await expect(
        inventoryService.decrementStock(legacyVariantId, { qty: 100 }),
      ).rejects.toMatchObject({
        code: INVENTORY_ERROR.INSUFFICIENT_STOCK,
        meta: expect.objectContaining({ available: 6 }),
      });
    });

    it("fails when sized stock is insufficient", async () => {
      await expect(
        inventoryService.decrementStock(sizedVariantId, { size: "s", qty: 5 }),
      ).rejects.toMatchObject({ code: INVENTORY_ERROR.INSUFFICIENT_STOCK });
    });

    it("rejects invalid quantity", async () => {
      await expect(
        inventoryService.decrementStock(legacyVariantId, { qty: 0 }),
      ).rejects.toMatchObject({ code: INVENTORY_ERROR.INVALID_QUANTITY });
    });
  });

  describe("releaseStock", () => {
    it("restores legacy inventory", async () => {
      const before = await inventoryService.getAvailableStock(legacyVariantId);
      const result = await inventoryService.releaseStock(legacyVariantId, { qty: 2 });

      expect(result).toMatchObject({
        mode: "legacy",
        available: before.available + 2,
        released: 2,
      });
    });

    it("restores per-size stock", async () => {
      const result = await inventoryService.releaseStock(sizedVariantId, {
        size: "s",
        qty: 1,
      });

      expect(result).toMatchObject({
        mode: "sized",
        size: "s",
        available: 2,
        released: 1,
      });
    });
  });

  it("throws VARIANT_NOT_FOUND for missing variant", async () => {
    const missingId = new mongoose.Types.ObjectId();
    await expect(
      inventoryService.getAvailableStock(missingId),
    ).rejects.toMatchObject({ code: INVENTORY_ERROR.VARIANT_NOT_FOUND });
  });
});
