jest.setTimeout(30000);

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Order = require("../../../models/Order");
const { testOrderAmounts } = require("../../helpers/orderAmounts");
const User = require("../../../models/User");
const {
  getSalesDashboardSummary,
} = require("../../../modules/commerce/analytics/salesDashboardService");

const addressSnapshot = {
  fullName: "Range User",
  phone: "9999999999",
  addressLine1: "1 Test Street",
  city: "Mumbai",
  state: "MH",
  pincode: "400001",
  country: "IN",
};

describe("sales analytics enhanced (Phase 12)", () => {
  let mongoServer;
  let userId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-sales-analytics-enhanced-tests",
    });

    const user = await User.create({
      name: "Range Customer",
      phone: "9123456712",
      email: "range-customer@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = user._id;

    await Order.create({
      orderNo: "RW260101AAAA01",
      userId,
      status: "delivered",
      paymentStatus: "paid",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 1000, total: 1000 }),
      addressSnapshot,
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
    });

    await Order.create({
      orderNo: "RW260215AAAA02",
      userId,
      status: "delivered",
      paymentStatus: "paid",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 2500, total: 2500 }),
      addressSnapshot,
      createdAt: new Date("2026-02-15T12:00:00.000Z"),
    });

    await Order.create({
      orderNo: "RW260215AAAA03",
      userId,
      status: "cancelled",
      paymentStatus: "cancelled",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 9000, total: 9000 }),
      addressSnapshot,
      createdAt: new Date("2026-02-16T12:00:00.000Z"),
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("filters GMV and top customers by date range", async () => {
    const result = await getSalesDashboardSummary({
      fromDate: "2026-02-01",
      toDate: "2026-02-28",
      period: "month",
      topCustomersLimit: 5,
    });

    expect(result.ok).toBe(true);
    expect(result.dashboard.gmv).toBe(2500);
    expect(result.dashboard.orderCount).toBe(1);
    expect(result.dashboard.topCustomers).toHaveLength(1);
    expect(result.dashboard.topCustomers[0]).toMatchObject({
      userId: String(userId),
      orderCount: 1,
      totalSpent: 2500,
    });
    expect(result.dashboard.gmvByPeriod).toEqual([
      { period: "2026-02", gmv: 2500, orderCount: 1 },
    ]);
    expect(result.dashboard.dateRange).toMatchObject({
      fromDate: "2026-02-01",
      toDate: "2026-02-28",
    });
  });

  it("rejects invalid date ranges", async () => {
    const result = await getSalesDashboardSummary({
      fromDate: "2026-03-01",
      toDate: "2026-02-01",
    });
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(400);
  });
});
