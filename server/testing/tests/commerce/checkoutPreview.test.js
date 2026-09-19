const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const fs = require("fs");
const path = require("path");

const Cart = require("../../../models/Cart");
const CommonSettings = require("../../../models/CommonSettings");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const cartService = require("../../../modules/commerce/cart/cartService");
const {
  previewCheckout,
  resolveFlatShippingTotal,
  CHECKOUT_PREVIEW_ERROR,
} = require("../../../modules/commerce/checkout/checkoutPreviewService");

describe("checkout preview API (Phase 13)", () => {
  let mongoServer;
  let userId;
  let legacyVariantId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-checkout-preview-tests",
    });

    userId = new mongoose.Types.ObjectId().toString();

    const category = await Category.create({
      name: "Dupattas",
      slug: "dupattas",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-preview",
      status: 1,
    });
    const product = await Product.create({
      name: "Banarasi Dupatta",
      slug: "banarasi-dupatta",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });

    const legacyVariant = await ProductVariant.create({
      productId: product._id,
      sku: "PREVIEW-LEGACY-01",
      attributes: { color: "red" },
      price: 1500,
      sizes: [],
    });
    legacyVariantId = legacyVariant._id;
    await Inventory.create({
      productVariantId: legacyVariantId,
      stock: 5,
    });

    await CommonSettings.getOrCreateSettings();
  });

  afterEach(async () => {
    await Cart.deleteMany({});
    await CommonSettings.updateOne(
      { singletonKey: "GLOBAL" },
      { $set: { flatShippingFee: 0 } },
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("returns flat shipping fee from common settings", async () => {
    await CommonSettings.updateOne(
      { singletonKey: "GLOBAL" },
      { $set: { flatShippingFee: 99 } },
    );

    const shippingTotal = await resolveFlatShippingTotal();
    expect(shippingTotal).toBe(99);
  });

  it("rejects preview for an empty cart", async () => {
    const result = await previewCheckout(userId);

    expect(result.ok).toBe(false);
    expect(result.code).toBe(CHECKOUT_PREVIEW_ERROR.EMPTY_CART);
    expect(result.statusCode).toBe(400);
  });

  it("returns line totals, stock state, and grand total", async () => {
    await cartService.addCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 2,
    });

    const result = await previewCheckout(userId);

    expect(result.ok).toBe(true);
    expect(result.preview).toMatchObject({
      itemCount: 2,
      amounts: {
        items: 3000,
        discount: 0,
        shipping: 0,
        gst: 0,
        total: 3000,
      },
      hasIssues: false,
      canCheckout: true,
    });
    expect(result.preview.items).toHaveLength(1);
    expect(result.preview.items[0]).toMatchObject({
      variantId: String(legacyVariantId),
      quantity: 2,
      unitPrice: 1500,
      lineTotal: 3000,
      stockSufficient: true,
      isAvailable: true,
    });
  });

  it("includes flat shipping in grand total", async () => {
    await CommonSettings.updateOne(
      { singletonKey: "GLOBAL" },
      { $set: { flatShippingFee: 150 } },
    );
    await cartService.addCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 1,
    });

    const result = await previewCheckout(userId);

    expect(result.preview.amounts.shipping).toBe(150);
    expect(result.preview.amounts.total).toBe(1650);
  });

  it("blocks checkout when stock is insufficient", async () => {
    await cartService.addCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 2,
    });

    await Inventory.findOneAndUpdate(
      { productVariantId: legacyVariantId },
      { $set: { stock: 1 } },
    );

    const result = await previewCheckout(userId);

    expect(result.preview.hasIssues).toBe(true);
    expect(result.preview.canCheckout).toBe(false);
    expect(result.preview.blockingIssues).toContain("INSUFFICIENT_STOCK");
  });

  it("mounts POST /api/checkout/preview behind UserAuth", () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        "../../../modules/commerce/checkout/checkoutRoutes.js",
      ),
      "utf8",
    );

    expect(source).toContain('"/preview"');
    expect(source).toContain("UserAuth");
    expect(source).toContain("previewCheckoutHandler");
  });
});
