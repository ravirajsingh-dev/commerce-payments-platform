const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const fs = require("fs");
const path = require("path");

const Cart = require("../../../models/Cart");
const User = require("../../../models/User");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const cartService = require("../../../modules/commerce/cart/cartService");
const {
  getAdminUserCart,
  clearAdminUserCart,
} = require("../../../modules/commerce/cart/adminCartService");

describe("admin user cart API (Phases 46–47)", () => {
  let mongoServer;
  let userId;
  let variantId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-admin-user-cart-tests",
    });

    const user = await User.create({
      name: "Cart User",
      phone: "9123456701",
      email: "user-cart@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = String(user._id);

    const category = await Category.create({
      name: "Sherwanis",
      slug: "sherwanis-user-cart",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-user-cart",
      status: 1,
    });
    const product = await Product.create({
      name: "Royal Sherwani",
      slug: "royal-sherwani-user-cart",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });

    const variant = await ProductVariant.create({
      productId: product._id,
      sku: "USER-CART-01",
      attributes: { color: "gold" },
      price: 2500,
      sizes: [],
    });
    variantId = String(variant._id);
    await Inventory.create({
      productVariantId: variant._id,
      stock: 20,
    });
  });

  afterEach(async () => {
    await Cart.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("returns enriched cart for a user with items", async () => {
    await cartService.addCartItem(userId, { variantId, qty: 2 });

    const result = await getAdminUserCart(userId);
    expect(result.ok).toBe(true);
    expect(result.user).toMatchObject({
      id: userId,
      name: "Cart User",
      email: "user-cart@example.com",
    });
    expect(result.cart.items).toHaveLength(1);
    expect(result.cart.items[0]).toMatchObject({
      sku: "USER-CART-01",
      productName: "Royal Sherwani",
      quantity: 2,
    });
    expect(result.cart.itemCount).toBe(2);
    expect(result.cart.subtotal).toBe(5000);
  });

  it("returns empty cart when user has no cart document", async () => {
    const result = await getAdminUserCart(userId);
    expect(result.ok).toBe(true);
    expect(result.cart.items).toHaveLength(0);
    expect(result.cart.itemCount).toBe(0);
  });

  it("clears cart lines and coupon", async () => {
    await cartService.addCartItem(userId, { variantId, qty: 1 });
    const cartDoc = await Cart.findOne({ userId });
    cartDoc.couponCode = "SAVE10";
    await cartDoc.save();

    const cleared = await clearAdminUserCart(userId);
    expect(cleared.ok).toBe(true);
    expect(cleared.cleared).toBe(true);
    expect(cleared.cart.items).toHaveLength(0);
    expect(cleared.cart.couponCode).toBe("");

    const stored = await Cart.findOne({ userId }).lean();
    expect(stored.items).toHaveLength(0);
    expect(stored.couponCode).toBe("");
  });

  it("reports cleared false when cart was already empty", async () => {
    const result = await clearAdminUserCart(userId);
    expect(result.ok).toBe(true);
    expect(result.cleared).toBe(false);
  });

  it("returns 404 when user does not exist", async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    const view = await getAdminUserCart(missingId);
    expect(view.ok).toBe(false);
    expect(view.statusCode).toBe(404);

    const cleared = await clearAdminUserCart(missingId);
    expect(cleared.ok).toBe(false);
    expect(cleared.statusCode).toBe(404);
  });

  it("rejects invalid user id", async () => {
    const result = await getAdminUserCart("not-a-valid-id");
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(400);
  });

  it("mounts cart routes on admin users router", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../../modules/admin/usersRoutes.js"),
      "utf8",
    );
    expect(source).toContain("/:user_id/cart");
    expect(source).toContain("getUserCart");
    expect(source).toContain("clearUserCart");
  });
});
