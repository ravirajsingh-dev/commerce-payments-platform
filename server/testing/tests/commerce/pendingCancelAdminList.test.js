jest.mock("../../../modules/commerce/order/orderEmails", () => ({
  scheduleOrderShippedEmail: jest.fn(),
  scheduleOrderPlacedEmail: jest.fn(),
}));

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Order = require("../../../models/Order");
const User = require("../../../models/User");
const { testOrderAmounts } = require("../../helpers/orderAmounts");
const { listAdminOrders } = require("../../../modules/commerce/order/orderAdminService");

const addressSnapshot = {
  fullName: "Pending Cancel Admin",
  phone: "9876543210",
  addressLine1: "12 MG Road",
  city: "Jaipur",
  state: "Rajasthan",
  pincode: "302001",
  country: "IN",
};

describe("admin pending cancel request list (Phase 02)", () => {
  let mongoServer;
  let userId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "pending-cancel-admin-list-tests",
    });

    const user = await User.create({
      name: "Pending Cancel User",
      phone: "9123456799",
      email: "pending-cancel@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = user._id;
  });

  afterEach(async () => {
    await Order.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("returns pending cancel count and filters pending requests", async () => {
    const requestedAt = new Date("2026-05-27T10:00:00.000Z");

    await Order.create({
      orderNo: "RJ250527PEND01",
      userId,
      status: "order_placed",
      paymentStatus: "cod_pending",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 1000, total: 1000 }),
      addressSnapshot,
      cancellation: {
        requestedAt,
        reason: "changed_mind",
        note: "Please cancel",
      },
    });

    await Order.create({
      orderNo: "RJ250527PEND02",
      userId,
      status: "order_confirmed",
      paymentStatus: "cod_pending",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 2000, total: 2000 }),
      addressSnapshot,
    });

    const all = await listAdminOrders({ page: 1, limit: 10 });
    expect(all.ok).toBe(true);
    expect(all.pendingCancelRequestCount).toBe(1);
    expect(all.orders).toHaveLength(2);

    const pendingOnly = await listAdminOrders({
      page: 1,
      limit: 10,
      pendingCancelRequest: "true",
    });
    expect(pendingOnly.ok).toBe(true);
    expect(pendingOnly.orders).toHaveLength(1);
    expect(pendingOnly.orders[0].orderNo).toBe("RJ250527PEND01");
    expect(pendingOnly.orders[0].cancellation.requestedAt).toEqual(requestedAt);
  });

  it("excludes cancelled orders from pending cancel count", async () => {
    await Order.create({
      orderNo: "RJ250527PEND03",
      userId,
      status: "cancelled",
      paymentStatus: "cancelled",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 500, total: 500 }),
      addressSnapshot,
      cancellation: {
        requestedAt: new Date("2026-05-26T10:00:00.000Z"),
        reason: "changed_mind",
        note: "",
      },
    });

    const result = await listAdminOrders({ page: 1, limit: 10 });
    expect(result.ok).toBe(true);
    expect(result.pendingCancelRequestCount).toBe(0);
  });

  it("applies real server-side sorting for admin list", async () => {
    await Order.create({
      orderNo: "RJ250527SORT01",
      userId,
      status: "order_confirmed",
      paymentStatus: "cod_pending",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 3000, total: 3000 }),
      addressSnapshot,
      createdAt: new Date("2026-05-26T10:00:00.000Z"),
      updatedAt: new Date("2026-05-26T10:00:00.000Z"),
    });

    await Order.create({
      orderNo: "RJ250527SORT03",
      userId,
      status: "packed",
      paymentStatus: "cod_pending",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 1000, total: 1000 }),
      addressSnapshot,
      createdAt: new Date("2026-05-27T10:00:00.000Z"),
      updatedAt: new Date("2026-05-27T10:00:00.000Z"),
    });

    await Order.create({
      orderNo: "RJ250527SORT02",
      userId,
      status: "order_placed",
      paymentStatus: "cod_pending",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 2000, total: 2000 }),
      addressSnapshot,
      createdAt: new Date("2026-05-25T10:00:00.000Z"),
      updatedAt: new Date("2026-05-25T10:00:00.000Z"),
    });

    const byTotalAsc = await listAdminOrders({
      page: 1,
      limit: 10,
      orderBy: "amounts.total",
      ascending: "asc",
    });
    expect(byTotalAsc.ok).toBe(true);
    expect(byTotalAsc.orders.map((row) => row.orderNo)).toEqual([
      "RJ250527SORT03",
      "RJ250527SORT02",
      "RJ250527SORT01",
    ]);

    const byOrderNoDesc = await listAdminOrders({
      page: 1,
      limit: 10,
      orderBy: "orderNo",
      ascending: "desc",
    });
    expect(byOrderNoDesc.ok).toBe(true);
    expect(byOrderNoDesc.orders.map((row) => row.orderNo)).toEqual([
      "RJ250527SORT03",
      "RJ250527SORT02",
      "RJ250527SORT01",
    ]);
  });
});
