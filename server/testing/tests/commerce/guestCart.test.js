jest.setTimeout(30000);

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
const User = require("../../../models/User");
const cartService = require("../../../modules/commerce/cart/cartService");
const { mergeGuestCartIntoUser } = require("../../../modules/commerce/cart/guestCartMerge");
const { ownerFromGuestSession } = require("../../../modules/commerce/cart/cartOwner");

describe("guest cart (Phase 8)", () => {
  let mongoServer;
  let userId;
  let legacyVariantId;
  const guestSessionId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-guest-cart-tests",
    });

    const user = await User.create({
      name: "Guest Cart User",
      phone: "9876543299",
      email: "guest-cart-user@example.com",
      password: "password123",
    });
    userId = String(user._id);

    const category = await Category.create({
      name: "Lehengas",
      slug: "lehengas-guest-cart",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-guest-cart",
      status: 1,
    });
    const product = await Product.create({
      name: "Guest Cart Lehenga",
      slug: "guest-cart-lehenga",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });

    const variant = await ProductVariant.create({
      productId: product._id,
      sku: "GUEST-CART-01",
      attributes: { color: "red" },
      price: 1800,
      sizes: [],
    });
    legacyVariantId = String(variant._id);
    await Inventory.create({
      productVariantId: variant._id,
      stock: 5,
    });
  });

  afterEach(async () => {
    await Cart.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("returns an empty cart for a guest without a session", async () => {
    const result = await cartService.getCart(ownerFromGuestSession(null));
    expect(result.ok).toBe(true);
    expect(result.cart).toMatchObject({
      id: null,
      userId: null,
      sessionId: null,
      isGuest: true,
      itemCount: 0,
      items: [],
    });
  });

  it("persists guest cart lines under sessionId", async () => {
    const owner = ownerFromGuestSession(guestSessionId);
    const added = await cartService.addCartItem(owner, {
      variantId: legacyVariantId,
      qty: 2,
    });
    expect(added.ok).toBe(true);
    expect(added.cart.sessionId).toBe(guestSessionId);
    expect(added.cart.isGuest).toBe(true);
    expect(added.cart.itemCount).toBe(2);

    const saved = await Cart.findOne({ sessionId: guestSessionId }).lean();
    expect(saved).toBeTruthy();
    expect(saved.userId).toBeFalsy();
    expect(saved.items).toHaveLength(1);
  });

  it("merges guest cart into the user cart and removes the guest document", async () => {
    const guestOwner = ownerFromGuestSession(guestSessionId);
    await cartService.addCartItem(guestOwner, {
      variantId: legacyVariantId,
      qty: 2,
    });

    await cartService.addCartItem(userId, {
      variantId: legacyVariantId,
      qty: 1,
    });

    const merged = await mergeGuestCartIntoUser(userId, guestSessionId);
    expect(merged.ok).toBe(true);
    expect(merged.merged).toBe(true);
    expect(merged.cart.itemCount).toBe(3);
    expect(merged.cart.userId).toBe(userId);

    const guestDoc = await Cart.findOne({ sessionId: guestSessionId });
    expect(guestDoc).toBeNull();

    const userDoc = await Cart.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    expect(userDoc.items[0].quantity).toBe(3);
  });

  it("mounts guest-aware cart routes", () => {
    const cartRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/cart/cartRoutes.js"),
      "utf8",
    );

    expect(cartRoutesSource).toContain("OptionalUserAuth");
    expect(cartRoutesSource).toContain("CartReadAccess");
    expect(cartRoutesSource).toContain("CartWriteAccess");
    expect(cartRoutesSource).toContain('"/merge"');
    expect(cartRoutesSource).toContain("mergeGuestCart");
  });
});
