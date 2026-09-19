jest.setTimeout(30000);

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const fs = require("fs");
const path = require("path");

const Order = require("../../../models/Order");
const OrderItem = require("../../../models/OrderItem");
const User = require("../../../models/User");
const {
  getSalesDashboardSummary,
  GMV_EXCLUDED_STATUSES,
} = require("../../../modules/commerce/analytics/salesDashboardService");
const { testOrderAmounts } = require("../../helpers/orderAmounts");

const addressSnapshot = {
  fullName: "Test User",
  phone: "9999999999",
  addressLine1: "1 Test Street",
  addressLine2: "",
  city: "Mumbai",
  state: "MH",
  pincode: "400001",
  country: "IN",
};

describe("sales dashboard (Phase 9)", () => {
  let mongoServer;
  let userId;
  let variantA;
  let variantB;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-sales-dashboard-tests",
    });

    const user = await User.create({
      name: "Sales Dash User",
      phone: "9876543201",
      email: "sales-dash@example.com",
      password: "password123",
    });
    userId = user._id;
    variantA = new mongoose.Types.ObjectId();
    variantB = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await OrderItem.deleteMany({});
    await Order.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  const createOrderWithItems = async ({
    orderNo,
    status,
    grandTotal,
    items,
  }) => {
    const order = await Order.create({
      orderNo,
      userId,
      status,
      paymentStatus: "paid",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: grandTotal, total: grandTotal }),
      addressSnapshot,
    });

    await OrderItem.insertMany(
      items.map((item) => ({
        orderId: order._id,
        productId: new mongoose.Types.ObjectId(),
        productVariantId: item.variantId,
        productNameSnapshot: item.productName,
        productSlugSnapshot: item.slug,
        skuSnapshot: item.sku,
        quantity: item.qty,
        unitPriceSnapshot: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    );

    return order;
  };

  it("returns zeroed metrics when there are no orders", async () => {
    const result = await getSalesDashboardSummary();
    expect(result.ok).toBe(true);
    expect(result.dashboard).toMatchObject({
      gmv: 0,
      aov: 0,
      orderCount: 0,
      totalOrders: 0,
      topSkus: [],
    });
  });

  it("computes GMV, AOV, and top SKUs excluding cancelled orders", async () => {
    await createOrderWithItems({
      orderNo: "RW260519AAAA01",
      status: "delivered",
      grandTotal: 5000,
      items: [
        {
          variantId: variantA,
          productName: "Silk A",
          slug: "silk-a",
          sku: "SKU-A",
          qty: 2,
          unitPrice: 1500,
          lineTotal: 3000,
        },
        {
          variantId: variantB,
          productName: "Silk B",
          slug: "silk-b",
          sku: "SKU-B",
          qty: 1,
          unitPrice: 2000,
          lineTotal: 2000,
        },
      ],
    });

    await createOrderWithItems({
      orderNo: "RW260519AAAA02",
      status: "order_confirmed",
      grandTotal: 1000,
      items: [
        {
          variantId: variantA,
          productName: "Silk A",
          slug: "silk-a",
          sku: "SKU-A",
          qty: 1,
          unitPrice: 1000,
          lineTotal: 1000,
        },
      ],
    });

    await createOrderWithItems({
      orderNo: "RW260519AAAA03",
      status: "cancelled",
      grandTotal: 9000,
      items: [
        {
          variantId: variantB,
          productName: "Silk B",
          slug: "silk-b",
          sku: "SKU-B",
          qty: 3,
          unitPrice: 3000,
          lineTotal: 9000,
        },
      ],
    });

    const result = await getSalesDashboardSummary({ topLimit: 5 });
    expect(result.ok).toBe(true);
    expect(result.dashboard.gmv).toBe(6000);
    expect(result.dashboard.orderCount).toBe(2);
    expect(result.dashboard.aov).toBe(3000);
    expect(result.dashboard.totalOrders).toBe(3);
    expect(result.dashboard.cancelledOrders).toBe(1);

    expect(result.dashboard.topSkus).toHaveLength(2);
    expect(result.dashboard.topSkus[0]).toMatchObject({
      rank: 1,
      variantId: String(variantA),
      sku: "SKU-A",
      unitsSold: 3,
      revenue: 4000,
    });
    expect(result.dashboard.topSkus[1]).toMatchObject({
      rank: 2,
      variantId: String(variantB),
      sku: "SKU-B",
      unitsSold: 1,
      revenue: 2000,
    });
  });

  it("documents GMV exclusion and mounts admin sales analytics route", () => {
    expect(GMV_EXCLUDED_STATUSES).toContain("cancelled");

    const adminRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/admin/adminRoutes.js"),
      "utf8",
    );
    const salesRoutesSource = fs.readFileSync(
      path.join(
        __dirname,
        "../../../modules/commerce/analytics/salesDashboardRoutes.js",
      ),
      "utf8",
    );

    expect(adminRoutesSource).toContain('"/admin/analytics/sales"');
    expect(salesRoutesSource).toContain("AdminAuth");
    expect(salesRoutesSource).toContain("getSalesDashboard");
  });
});
