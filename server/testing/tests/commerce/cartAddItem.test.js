const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const fs = require("fs");
const path = require("path");

const Cart = require("../../../models/Cart");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const cartService = require("../../../modules/commerce/cart/cartService");
const { INVENTORY_ERROR } = require("../../../modules/commerce/inventory/inventoryService");

describe("cart add item API (Phase 10)", () => {
  let mongoServer;
  let userId;
  let productId;
  let legacyVariantId;
  let sizedVariantId;
  let inactiveVariantId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-cart-add-item-tests",
    });

    userId = new mongoose.Types.ObjectId().toString();

    const category = await Category.create({
      name: "Sarees",
      slug: "sarees",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-cart",
      status: 1,
    });
    const product = await Product.create({
      name: "Silk Saree",
      slug: "silk-saree-cart",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });
    productId = product._id;

    const legacyVariant = await ProductVariant.create({
      productId,
      sku: "CART-LEGACY-01",
      attributes: { color: "gold" },
      price: 2500,
      sizes: [],
    });
    legacyVariantId = legacyVariant._id;
    await Inventory.create({
      productVariantId: legacyVariantId,
      stock: 4,
    });

    const sizedVariant = await ProductVariant.create({
      productId,
      sku: "CART-SIZED-01",
      attributes: { color: "maroon" },
      price: 3200,
      sizes: [
        { value: "s", label: "S", stock: 2 },
        { value: "m", label: "M", stock: 6 },
      ],
    });
    sizedVariantId = sizedVariant._id;

    const inactiveVariant = await ProductVariant.create({
      productId,
      sku: "CART-INACTIVE-01",
      attributes: { color: "grey" },
      price: 1000,
      status: 2,
      sizes: [],
    });
    inactiveVariantId = inactiveVariant._id;
  });

  afterEach(async () => {
    await Cart.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("adds a legacy variant with price snapshot", async () => {
    const result = await cartService.addCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 2,
    });

    expect(result.ok).toBe(true);
    expect(result.cart.items).toHaveLength(1);
    expect(result.cart.items[0]).toMatchObject({
      productId: String(productId),
      variantId: String(legacyVariantId),
      size: "",
      quantity: 2,
      unitPriceSnapshot: 2500,
      lineTotal: 5000,
    });
    expect(result.cart.items[0].attributesSnapshot).toEqual({ color: "gold" });
    expect(result.cart.itemCount).toBe(2);
    expect(result.cart.subtotal).toBe(5000);

    const saved = await Cart.findOne({ userId }).lean();
    expect(saved.items).toHaveLength(1);
    expect(saved.items[0].unitPriceSnapshot).toBe(2500);
  });

  it("merges quantity for the same variant and size", async () => {
    await cartService.addCartItem(userId, {
      variantId: String(sizedVariantId),
      size: "m",
      qty: 1,
    });

    const result = await cartService.addCartItem(userId, {
      variantId: String(sizedVariantId),
      size: "M",
      qty: 2,
    });

    expect(result.ok).toBe(true);
    expect(result.cart.items).toHaveLength(1);
    expect(result.cart.items[0]).toMatchObject({
      variantId: String(sizedVariantId),
      size: "m",
      quantity: 3,
      unitPriceSnapshot: 3200,
      lineTotal: 9600,
    });
  });

  it("rejects when requested quantity exceeds available stock", async () => {
    const result = await cartService.addCartItem(userId, {
      variantId: String(sizedVariantId),
      size: "s",
      qty: 5,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe(INVENTORY_ERROR.INSUFFICIENT_STOCK);
    expect(result.errors[0].path).toBe("qty");
    expect(await Cart.countDocuments({ userId })).toBe(0);
  });

  it("rejects inactive variants", async () => {
    const result = await cartService.addCartItem(userId, {
      variantId: String(inactiveVariantId),
      qty: 1,
    });

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.errors[0].path).toBe("variantId");
  });

  it("requires size for sized variants", async () => {
    const result = await cartService.addCartItem(userId, {
      variantId: String(sizedVariantId),
      qty: 1,
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0].path).toBe("size");
  });

  it("rejects invalid variant id", async () => {
    const result = await cartService.addCartItem(userId, {
      variantId: "not-an-id",
      qty: 1,
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0].path).toBe("variantId");
  });

  it("mounts POST /api/cart/items with guest cart access middleware", () => {
    const cartRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/cart/cartRoutes.js"),
      "utf8",
    );
    const commerceRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/commerceRoutes.js"),
      "utf8",
    );

    expect(commerceRoutesSource).toContain('"/cart"');
    expect(cartRoutesSource).toContain('"/items"');
    expect(cartRoutesSource).toContain("CartWriteAccess");
    expect(cartRoutesSource).toContain("addCartItem");
  });
});
