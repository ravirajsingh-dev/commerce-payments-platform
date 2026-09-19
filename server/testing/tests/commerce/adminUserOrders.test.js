const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const fs = require("fs");
const path = require("path");

const Cart = require("../../../models/Cart");
const Order = require("../../../models/Order");
const User = require("../../../models/User");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const cartService = require("../../../modules/commerce/cart/cartService");
const { placeOrder } = require("../../../modules/commerce/checkout/placeOrderService");
const {
  listAdminOrdersByUserId,
} = require("../../../modules/commerce/order/orderAdminService");

describe("admin user orders API (Phase 48)", () => {
  let mongoServer;
  let userId;
  let otherUserId;
  let legacyVariantId;

  const shippingAddress = {
    fullName: "User Orders Test",
    phone: "9876543210",
    addressLine1: "12 MG Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    country: "IN",
  };

  const placeTestOrder = async (forUserId) => {
    await cartService.addCartItem(forUserId, {
      variantId: String(legacyVariantId),
      qty: 1,
    });
    const result = await placeOrder(forUserId, {
      ...shippingAddress,
      paymentMethod: "cod",
    });
    expect(result.ok).toBe(true);
    return result.order;
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-admin-user-orders-tests",
    });

    const user = await User.create({
      name: "Orders User",
      phone: "9123456792",
      email: "user-orders@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = String(user._id);

    const other = await User.create({
      name: "Other User",
      phone: "9123456793",
      email: "other-user@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    otherUserId = String(other._id);

    const category = await Category.create({
      name: "Sherwanis",
      slug: "sherwanis-user-orders",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-user-orders",
      status: 1,
    });
    const product = await Product.create({
      name: "Royal Sherwani",
      slug: "royal-sherwani-user-orders",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });

    const legacyVariant = await ProductVariant.create({
      productId: product._id,
      sku: "USER-ORDERS-01",
      attributes: { color: "gold" },
      price: 2500,
      sizes: [],
    });
    legacyVariantId = legacyVariant._id;
    await Inventory.create({
      productVariantId: legacyVariantId,
      stock: 20,
    });
  });

  afterEach(async () => {
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await Inventory.findOneAndUpdate(
      { productVariantId: legacyVariantId },
      { $set: { stock: 20 } },
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("lists orders for a single user with pagination and filters", async () => {
    const orderA = await placeTestOrder(userId);
    await placeTestOrder(userId);
    await placeTestOrder(otherUserId);

    const list = await listAdminOrdersByUserId(userId, { page: 1, limit: 10 });
    expect(list.ok).toBe(true);
    expect(list.orders).toHaveLength(2);
    expect(list.orders.every((row) => row.userId === userId)).toBe(true);
    expect(list.orders.map((row) => row.orderNo)).toContain(orderA.orderNo);

    const filtered = await listAdminOrdersByUserId(userId, {
      orderNo: orderA.orderNo.slice(0, 6),
    });
    expect(filtered.ok).toBe(true);
    expect(filtered.orders.length).toBeGreaterThanOrEqual(1);
    expect(filtered.summary).toMatchObject({
      pending: expect.any(Number),
    });
  });

  it("returns 404 when user does not exist", async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    const result = await listAdminOrdersByUserId(missingId);
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(404);
  });

  it("rejects invalid user id", async () => {
    const result = await listAdminOrdersByUserId("not-a-valid-id");
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(400);
  });

  it("mounts GET /api/admin/users/:user_id/orders on users routes", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../../modules/admin/usersRoutes.js"),
      "utf8",
    );
    expect(source).toContain("/:user_id/orders");
    expect(source).toContain("getUserOrders");
  });
});
