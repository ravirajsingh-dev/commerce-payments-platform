jest.setTimeout(30000);

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Wishlist = require("../../../models/Wishlist");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const User = require("../../../models/User");
const {
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  toggleWishlistItem,
} = require("../../../modules/commerce/wishlist/wishlistService");

describe("wishlist (Phases 6–7)", () => {
  let mongoServer;
  let userId;
  let variantId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-wishlist-tests",
    });

    const user = await User.create({
      name: "Wishlist User",
      phone: "9876543212",
      email: "wishlist-user@example.com",
      password: "password123",
    });
    userId = String(user._id);

    const category = await Category.create({
      name: "Sherwanis",
      slug: "sherwanis-wishlist",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-wishlist",
      status: 1,
    });
    const product = await Product.create({
      name: "Wishlist Sherwani",
      slug: "wishlist-sherwani",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });
    const variant = await ProductVariant.create({
      productId: product._id,
      sku: "WISH-01",
      name: "Gold Sherwani",
      attributes: { color: "gold" },
      price: 2500,
      sizes: [],
      status: 1,
    });
    variantId = String(variant._id);
  });

  afterEach(async () => {
    await Wishlist.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("returns an empty wishlist for a new user", async () => {
    const result = await getWishlist(userId);
    expect(result.ok).toBe(true);
    expect(result.wishlist).toMatchObject({
      itemCount: 0,
      items: [],
    });
  });

  it("adds and removes a variant", async () => {
    const added = await addWishlistItem(userId, variantId);
    expect(added.ok).toBe(true);
    expect(added.wishlist.itemCount).toBe(1);
    expect(added.wishlist.items[0]).toMatchObject({
      variantId,
      productSlug: "wishlist-sherwani",
      displayName: "Gold Sherwani",
    });

    const duplicate = await addWishlistItem(userId, variantId);
    expect(duplicate.ok).toBe(false);
    expect(duplicate.code).toBe("ALREADY_IN_WISHLIST");

    const removed = await removeWishlistItem(userId, variantId);
    expect(removed.ok).toBe(true);
    expect(removed.wishlist.itemCount).toBe(0);
  });

  it("toggles wishlist membership", async () => {
    const on = await toggleWishlistItem(userId, variantId);
    expect(on.ok).toBe(true);
    expect(on.wishlist.itemCount).toBe(1);

    const off = await toggleWishlistItem(userId, variantId);
    expect(off.ok).toBe(true);
    expect(off.wishlist.itemCount).toBe(0);
  });
});
