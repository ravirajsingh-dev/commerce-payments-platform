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
const {
  CART_ITEM_ISSUE,
  CART_ERROR,
} = require("../../../modules/commerce/cart/cartService");
const { INVENTORY_ERROR } = require("../../../modules/commerce/inventory/inventoryService");

describe("cart CRUD API (Phase 11)", () => {
  let mongoServer;
  let userId;
  let legacyVariantId;
  let sizedVariantId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-cart-crud-tests",
    });

    userId = new mongoose.Types.ObjectId().toString();

    const category = await Category.create({
      name: "Lehengas",
      slug: "lehengas",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-cart-crud",
      status: 1,
    });
    const product = await Product.create({
      name: "Bridal Lehenga",
      slug: "bridal-lehenga-cart",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });

    const legacyVariant = await ProductVariant.create({
      productId: product._id,
      sku: "CRUD-LEGACY-01",
      attributes: { color: "ivory" },
      price: 18000,
      sizes: [],
    });
    legacyVariantId = legacyVariant._id;
    await Inventory.create({
      productVariantId: legacyVariantId,
      stock: 3,
    });

    const sizedVariant = await ProductVariant.create({
      productId: product._id,
      sku: "CRUD-SIZED-01",
      attributes: { color: "red" },
      price: 15000,
      sizes: [
        { value: "s", label: "S", stock: 1 },
        { value: "l", label: "L", stock: 4 },
      ],
    });
    sizedVariantId = sizedVariant._id;
  });

  const resetSizedVariantStock = async () => {
    await ProductVariant.findByIdAndUpdate(sizedVariantId, {
      sizes: [
        { value: "s", label: "S", stock: 1 },
        { value: "l", label: "L", stock: 4 },
      ],
    });
  };

  afterEach(async () => {
    await Cart.deleteMany({});
    await resetSizedVariantStock();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("returns an empty cart when none exists", async () => {
    const result = await cartService.getCart(userId);

    expect(result.ok).toBe(true);
    expect(result.cart).toMatchObject({
      id: null,
      userId,
      items: [],
      itemCount: 0,
      subtotal: 0,
      subtotalAtCurrentPrices: 0,
      hasIssues: false,
    });
  });

  it("returns live stock and price data on GET", async () => {
    await cartService.addCartItem(userId, {
      variantId: String(sizedVariantId),
      size: "l",
      qty: 2,
    });

    await ProductVariant.findByIdAndUpdate(sizedVariantId, { price: 16000 });

    const result = await cartService.getCart(userId);

    expect(result.ok).toBe(true);
    expect(result.cart.items[0]).toMatchObject({
      variantId: String(sizedVariantId),
      size: "l",
      quantity: 2,
      unitPriceSnapshot: 15000,
      currentUnitPrice: 16000,
      availableStock: 4,
      stockSufficient: true,
      priceChanged: true,
      isAvailable: true,
    });
    expect(result.cart.items[0].issues).toContain(CART_ITEM_ISSUE.PRICE_CHANGED);
    expect(result.cart.hasIssues).toBe(true);
    expect(result.cart.subtotal).toBe(30000);
    expect(result.cart.subtotalAtCurrentPrices).toBe(32000);
  });

  it("flags insufficient stock on GET without mutating the cart", async () => {
    await cartService.addCartItem(userId, {
      variantId: String(sizedVariantId),
      size: "s",
      qty: 1,
    });

    await ProductVariant.findOneAndUpdate(
      { _id: sizedVariantId, "sizes.value": "s" },
      { $set: { "sizes.$.stock": 0 } },
    );

    const result = await cartService.getCart(userId);

    expect(result.cart.items[0]).toMatchObject({
      quantity: 1,
      availableStock: 0,
      stockSufficient: false,
    });
    expect(result.cart.items[0].issues).toContain(
      CART_ITEM_ISSUE.INSUFFICIENT_STOCK,
    );

    const saved = await Cart.findOne({ userId }).lean();
    expect(saved.items[0].quantity).toBe(1);
  });

  it("updates item quantity with stock validation", async () => {
    await cartService.addCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 1,
    });

    const result = await cartService.updateCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 3,
    });

    expect(result.ok).toBe(true);
    expect(result.cart.items[0].quantity).toBe(3);
    expect(result.cart.itemCount).toBe(3);
  });

  it("rejects update when quantity exceeds stock", async () => {
    await cartService.addCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 1,
    });

    const result = await cartService.updateCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 10,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe(INVENTORY_ERROR.INSUFFICIENT_STOCK);
  });

  it("returns 404 when updating a line that is not in the cart", async () => {
    await cartService.addCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 1,
    });

    const result = await cartService.updateCartItem(userId, {
      variantId: String(sizedVariantId),
      size: "l",
      qty: 1,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe(CART_ERROR.ITEM_NOT_FOUND);
  });

  it("changes cart line size and preserves quantity", async () => {
    await cartService.addCartItem(userId, {
      variantId: String(sizedVariantId),
      size: "s",
      qty: 1,
    });

    const result = await cartService.updateCartItem(userId, {
      variantId: String(sizedVariantId),
      size: "s",
      newSize: "l",
      qty: 1,
    });

    expect(result.ok).toBe(true);
    expect(result.cart.items).toHaveLength(1);
    expect(result.cart.items[0]).toMatchObject({
      size: "l",
      quantity: 1,
    });
  });

  it("removes a sized line using variant id and size", async () => {
    const addSmall = await cartService.addCartItem(userId, {
      variantId: String(sizedVariantId),
      size: "s",
      qty: 1,
    });
    const addLarge = await cartService.addCartItem(userId, {
      variantId: String(sizedVariantId),
      size: "l",
      qty: 1,
    });
    expect(addSmall.ok).toBe(true);
    expect(addLarge.ok).toBe(true);

    const result = await cartService.removeCartItem(
      userId,
      String(sizedVariantId),
      "S",
    );

    expect(result.ok).toBe(true);
    expect(result.cart.items).toHaveLength(1);
    expect(result.cart.items[0].size).toBe("l");
  });

  it("returns 404 when removing a missing line", async () => {
    await cartService.addCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 1,
    });

    const result = await cartService.removeCartItem(
      userId,
      String(sizedVariantId),
      "m",
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe(CART_ERROR.ITEM_NOT_FOUND);
  });

  it("mounts GET, PATCH, and DELETE cart routes behind UserAuth", () => {
    const cartRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/cart/cartRoutes.js"),
      "utf8",
    );

    expect(cartRoutesSource).toContain('router.get("/", UserAuth');
    expect(cartRoutesSource).toContain('router.patch("/items"');
    expect(cartRoutesSource).toContain('router.delete(\n  "/items/:variantId"');
    expect(cartRoutesSource).toContain("getCart");
    expect(cartRoutesSource).toContain("updateCartItem");
    expect(cartRoutesSource).toContain("removeCartItem");
  });
});
