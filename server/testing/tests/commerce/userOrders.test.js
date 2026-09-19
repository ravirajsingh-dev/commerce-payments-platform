const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const fs = require("fs");
const path = require("path");

const Cart = require("../../../models/Cart");
const Order = require("../../../models/Order");
const OrderItem = require("../../../models/OrderItem");
const User = require("../../../models/User");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const cartService = require("../../../modules/commerce/cart/cartService");
const { placeOrder } = require("../../../modules/commerce/checkout/placeOrderService");
const {
  listUserOrders,
  getUserOrderByOrderNo,
  ORDER_ERROR,
} = require("../../../modules/commerce/order/orderService");
const { updateAdminOrder } = require("../../../modules/commerce/order/orderAdminService");

describe("user order history API (Phase 16)", () => {
  let mongoServer;
  let userId;
  let otherUserId;
  let legacyVariantId;

  const shippingAddress = {
    fullName: "Ravi Raj Singh",
    phone: "9876543210",
    addressLine1: "12 MG Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    country: "IN",
  };

  const placeTestOrder = async (ownerId, qty = 1) => {
    await cartService.addCartItem(ownerId, {
      variantId: String(legacyVariantId),
      qty,
    });

    const result = await placeOrder(ownerId, {
      ...shippingAddress,
      paymentMethod: "cod",
    });

    expect(result.ok).toBe(true);
    return result.order;
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-user-orders-tests",
    });

    const user = await User.create({
      name: "Order Owner",
      phone: "9123456780",
      email: "order-owner@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    const other = await User.create({
      name: "Other User",
      phone: "9123456781",
      email: "other-user@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = String(user._id);
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
      sku: "USER-ORDERS-LEGACY-01",
      attributes: { color: "ivory" },
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
    await OrderItem.deleteMany({});
    await Inventory.findOneAndUpdate(
      { productVariantId: legacyVariantId },
      { $set: { stock: 20 } },
    );
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("lists only the authenticated user's orders with pagination", async () => {
    const first = await placeTestOrder(userId, 1);
    const second = await placeTestOrder(userId, 2);
    await placeTestOrder(otherUserId, 1);

    const result = await listUserOrders(userId, { page: 1, limit: 10 });

    expect(result.ok).toBe(true);
    expect(result.orders).toHaveLength(2);
    expect(result.orders[0].orderNo).toBe(second.orderNo);
    expect(result.orders[1].orderNo).toBe(first.orderNo);
    expect(result.orders[0]).toMatchObject({
      status: "order_placed",
      paymentStatus: "cod_pending",
      paymentMethod: "cod",
      itemCount: 1,
      amounts: expect.objectContaining({ total: 5000 }),
    });
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    });
  });

  it("returns a single order with line items for the owner", async () => {
    const placed = await placeTestOrder(userId, 2);

    const result = await getUserOrderByOrderNo(userId, placed.orderNo);

    expect(result.ok).toBe(true);
    expect(result.order).toMatchObject({
      orderNo: placed.orderNo,
      status: "order_placed",
      amounts: expect.objectContaining({ total: 5000 }),
      itemCount: 1,
    });
    expect(result.order.addressSnapshot.fullName).toBe(shippingAddress.fullName);
    expect(result.order.items).toHaveLength(1);
    expect(result.order.items[0]).toMatchObject({
      variantId: String(legacyVariantId),
      quantity: 2,
      unitPriceSnapshot: 2500,
      lineTotal: 5000,
      skuSnapshot: "USER-ORDERS-LEGACY-01",
      productSlugSnapshot: "royal-sherwani-user-orders",
    });
  });

  it("reflects admin status updates on order detail", async () => {
    const placed = await placeTestOrder(userId, 1);
    const adminId = new mongoose.Types.ObjectId().toString();

    await updateAdminOrder(
      placed.orderNo,
      { status: "shipped" },
      { actorId: adminId },
    );

    const result = await getUserOrderByOrderNo(userId, placed.orderNo);

    expect(result.ok).toBe(true);
    expect(result.order).toMatchObject({
      status: "shipped",
    });
  });

  it("returns not found when another user requests the order", async () => {
    const placed = await placeTestOrder(userId, 1);

    const result = await getUserOrderByOrderNo(otherUserId, placed.orderNo);

    expect(result.ok).toBe(false);
    expect(result.code).toBe(ORDER_ERROR.NOT_FOUND);
    expect(result.statusCode).toBe(404);
  });

  it("rejects invalid order numbers", async () => {
    const result = await getUserOrderByOrderNo(userId, "not-a-real-order");

    expect(result.ok).toBe(false);
    expect(result.code).toBe(ORDER_ERROR.INVALID_ORDER_NO);
    expect(result.statusCode).toBe(400);
  });

  it("mounts GET /api/orders routes behind UserAuth", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/order/orderRoutes.js"),
      "utf8",
    );

    expect(source).toContain('router.get("/", UserAuth');
    expect(source).toContain('router.get(\n  "/:orderNo"');
    expect(source).toContain("listUserOrders");
    expect(source).toContain("getUserOrderByOrderNo");
  });
});
