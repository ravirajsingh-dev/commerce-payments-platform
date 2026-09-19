jest.setTimeout(30000);

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const fs = require("fs");
const path = require("path");

const Order = require("../../../models/Order");
const { testOrderAmounts } = require("../../helpers/orderAmounts");
const OrderItem = require("../../../models/OrderItem");
const User = require("../../../models/User");
const {
  getCustomerOrderAnalytics,
} = require("../../../modules/commerce/analytics/customerAnalyticsService");

const addressSnapshot = {
  fullName: "Analytics User",
  phone: "9876543210",
  addressLine1: "12 MG Road",
  city: "Jaipur",
  state: "Rajasthan",
  pincode: "302001",
  country: "IN",
};

describe("customer analytics (Phase 11)", () => {
  let mongoServer;
  let userId;
  let productId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-customer-analytics-tests",
    });

    const user = await User.create({
      name: "Analytics Customer",
      phone: "9123456701",
      email: "analytics-customer@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = String(user._id);
    productId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await OrderItem.deleteMany({});
    await Order.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  const createOrder = async ({ orderNo, status, grandTotal, createdAt }) => {
    const order = await Order.create({
      orderNo,
      userId,
      status,
      paymentStatus: status === "cancelled" ? "cancelled" : "paid",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: grandTotal, total: grandTotal }),
      addressSnapshot,
      createdAt: createdAt || new Date(),
    });

    await OrderItem.create({
      orderId: order._id,
      productId,
      productVariantId: new mongoose.Types.ObjectId(),
      productNameSnapshot: "Test Product",
      productSlugSnapshot: "test-product",
      skuSnapshot: "TEST-SKU",
      quantity: 1,
      unitPriceSnapshot: grandTotal,
      lineTotal: grandTotal,
    });

    return order;
  };

  it("returns zeroed analytics for a user with no orders", async () => {
    const result = await getCustomerOrderAnalytics(userId);
    expect(result.ok).toBe(true);
    expect(result.analytics).toMatchObject({
      userId,
      orderCount: 0,
      totalSpent: 0,
      aov: 0,
      totalOrders: 0,
      firstOrderAt: null,
      lastOrderAt: null,
    });
  });

  it("computes count, spent, AOV, and order dates excluding cancelled orders", async () => {
    const firstDate = new Date("2026-01-10T10:00:00.000Z");
    const secondDate = new Date("2026-02-15T12:00:00.000Z");

    await createOrder({
      orderNo: "RW260110AAAA01",
      status: "cancelled",
      grandTotal: 5000,
      createdAt: firstDate,
    });

    await createOrder({
      orderNo: "RW260215AAAA02",
      status: "delivered",
      grandTotal: 3000,
      createdAt: secondDate,
    });

    const result = await getCustomerOrderAnalytics(userId);
    expect(result.ok).toBe(true);
    expect(result.analytics).toMatchObject({
      orderCount: 1,
      totalSpent: 3000,
      aov: 3000,
      totalOrders: 2,
      cancelledOrders: 1,
    });
    expect(new Date(result.analytics.firstOrderAt).toISOString()).toBe(
      secondDate.toISOString(),
    );
    expect(new Date(result.analytics.lastOrderAt).toISOString()).toBe(
      secondDate.toISOString(),
    );
    expect(result.analytics.orderStatusBreakdown.delivered).toBe(1);
    expect(result.analytics.orderStatusBreakdown.cancelled).toBe(1);
  });

  it("returns 404 for missing users and mounts admin analytics route", async () => {
    const missing = await getCustomerOrderAnalytics(
      new mongoose.Types.ObjectId().toString(),
    );
    expect(missing.ok).toBe(false);
    expect(missing.statusCode).toBe(404);

    const routesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/admin/usersRoutes.js"),
      "utf8",
    );
    expect(routesSource).toContain("/:user_id/analytics");
    expect(routesSource).toContain("getUserAnalytics");
  });
});
