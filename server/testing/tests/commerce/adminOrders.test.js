const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const fs = require("fs");
const path = require("path");

const Cart = require("../../../models/Cart");
const Order = require("../../../models/Order");
const OrderItem = require("../../../models/OrderItem");
const User = require("../../../models/User");
const UserAddress = require("../../../models/UserAddress");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const cartService = require("../../../modules/commerce/cart/cartService");
const { placeOrder } = require("../../../modules/commerce/checkout/placeOrderService");
const {
  listAdminOrders,
  getAdminOrderByOrderNo,
  updateAdminOrder,
  ORDER_ADMIN_ERROR,
} = require("../../../modules/commerce/order/orderAdminService");
describe("admin orders API (Phase 18)", () => {
  let mongoServer;
  let userId;
  let legacyVariantId;

  const shippingAddress = {
    fullName: "Admin Test User",
    phone: "9876543210",
    addressLine1: "12 MG Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    country: "IN",
  };

  const placeTestOrder = async () => {
    await cartService.addCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 1,
    });
    const result = await placeOrder(userId, {
      ...shippingAddress,
      paymentMethod: "cod",
    });
    expect(result.ok).toBe(true);
    return result.order;
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-admin-orders-tests",
    });

    const user = await User.create({
      name: "Order Customer",
      phone: "9123456780",
      email: "orders-customer@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = String(user._id);

    const category = await Category.create({
      name: "Sherwanis",
      slug: "sherwanis-admin-orders",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-admin-orders",
      status: 1,
    });
    const product = await Product.create({
      name: "Royal Sherwani",
      slug: "royal-sherwani-admin-orders",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });

    const legacyVariant = await ProductVariant.create({
      productId: product._id,
      sku: "ADMIN-ORDERS-01",
      attributes: { color: "gold" },
      price: 3000,
      sizes: [],
    });
    legacyVariantId = legacyVariant._id;
    await Inventory.create({
      productVariantId: legacyVariantId,
      stock: 10,
    });
  });

  afterEach(async () => {
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await OrderItem.deleteMany({});
    await Inventory.findOneAndUpdate(
      { productVariantId: legacyVariantId },
      { $set: { stock: 10 } },
    );
  });

  afterAll(async () => {
    await UserAddress.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("lists orders with customer info and filters by status", async () => {
    const placed = await placeTestOrder();

    const listResult = await listAdminOrders({ page: 1, limit: 10 });
    expect(listResult.ok).toBe(true);
    expect(listResult.orders).toHaveLength(1);
    expect(listResult.orders[0]).toMatchObject({
      orderNo: placed.orderNo,
      status: "order_placed",
      customer: {
        id: userId,
        name: "Order Customer",
        email: "orders-customer@example.com",
        phone: "9123456780",
      },
    });

    const filtered = await listAdminOrders({ status: "shipped" });
    expect(filtered.ok).toBe(true);
    expect(filtered.orders).toHaveLength(0);
  });

  it("returns order detail and updates status", async () => {
    const placed = await placeTestOrder();

    const detail = await getAdminOrderByOrderNo(placed.orderNo);
    expect(detail.ok).toBe(true);
    expect(detail.order.addressSnapshot.fullName).toBe(shippingAddress.fullName);
    expect(detail.order.items).toHaveLength(1);

    const updated = await updateAdminOrder(placed.orderNo, {
      status: "order_confirmed",
    });
    expect(updated.ok).toBe(true);
    expect(updated.order).toMatchObject({
      status: "order_confirmed",
    });

    const persisted = await Order.findOne({ orderNo: placed.orderNo }).lean();
    expect(persisted.status).toBe("order_confirmed");
  });

  it("auto-sets cod_paid when admin marks COD order delivered", async () => {
    const placed = await placeTestOrder();

    const updated = await updateAdminOrder(placed.orderNo, {
      status: "delivered",
    });

    expect(updated.ok).toBe(true);
    expect(updated.order.status).toBe("delivered");
    expect(updated.order.paymentStatus).toBe("cod_paid");

    const persisted = await Order.findOne({ orderNo: placed.orderNo }).lean();
    expect(persisted.paymentStatus).toBe("cod_paid");
  });

  it("rejects invalid order numbers", async () => {
    const result = await getAdminOrderByOrderNo("BAD-ORDER");
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ORDER_ADMIN_ERROR.INVALID_ORDER_NO);
  });

  it("mounts admin order routes behind AdminAuth", () => {
    const adminRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/admin/adminRoutes.js"),
      "utf8",
    );
    const orderAdminRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/order/orderAdminRoutes.js"),
      "utf8",
    );

    expect(adminRoutesSource).toContain('"/admin/orders"');
    expect(orderAdminRoutesSource).toContain('"/list"');
    expect(orderAdminRoutesSource).toContain("AdminAuth");
    expect(orderAdminRoutesSource).toContain("updateAdminOrder");
  });
});
