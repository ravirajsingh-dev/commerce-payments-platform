jest.mock("../../../modules/commerce/order/orderEmails", () => ({
  scheduleOrderShippedEmail: jest.fn(),
  scheduleOrderPlacedEmail: jest.fn(),
}));

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Order = require("../../../models/Order");
const User = require("../../../models/User");
const Carrier = require("../../../models/Carrier");
const { testOrderAmounts } = require("../../helpers/orderAmounts");
const {
  getUserOrderByOrderNo,
  listUserOrders,
} = require("../../../modules/commerce/order/orderService");
const {
  createShipment,
  createTrackingEvent,
} = require("../../../modules/commerce/order/shipment/shipmentService");

describe("user order shipment serializers (Phase 3)", () => {
  let mongoServer;
  let userId;
  let orderNo;
  let carrierId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "shipment-user-tests",
    });

    const user = await User.create({
      name: "Shipment Customer",
      phone: "9123456705",
      email: "shipment-user@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = String(user._id);

    const carrier = await Carrier.create({
      name: "Ekart",
      slug: "ekart-user",
      trackingUrl: "https://ekart.example/{awb}",
      isActive: true,
    });
    carrierId = carrier._id;

    orderNo = "RJ250526USER01";
    await Order.create({
      orderNo,
      userId: user._id,
      status: "order_placed",
      paymentStatus: "cod_pending",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 1500, total: 1500 }),
      addressSnapshot: {
        fullName: "Shipment Customer",
        phone: "9123456705",
        addressLine1: "4 Road",
        city: "Jaipur",
        state: "Rajasthan",
        pincode: "302001",
        country: "IN",
      },
    });
  });

  afterEach(async () => {
    await mongoose.model("tracking_events").deleteMany({});
    await mongoose.model("shipments").deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("returns null shipment payload when no shipment is assigned", async () => {
    const result = await getUserOrderByOrderNo(userId, orderNo);

    expect(result.ok).toBe(true);
    expect(result.order.shipment).toBeNull();
    expect(result.order.trackingEvents).toEqual([]);
    expect(result.order.shipmentSummary).toBeNull();
  });

  it("includes shipment, events, and summary on order detail", async () => {
    await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-USER-001",
    });

    await createTrackingEvent(orderNo, {
      status: "shipped",
      message: "On the way",
      location: "Jaipur",
      eventAt: new Date("2026-05-26T08:00:00.000Z"),
    });

    await Order.updateOne({ orderNo }, { $set: { status: "shipped" } });

    const result = await getUserOrderByOrderNo(userId, orderNo);

    expect(result.ok).toBe(true);
    expect(result.order.shipment).toMatchObject({
      orderNo,
      carrierName: "Ekart",
      trackingNumber: "AWB-USER-001",
      carrierTrackingUrl: "https://ekart.example/{awb}",
      currentStatus: "shipped",
    });
    expect(result.order.trackingEvents).toHaveLength(1);
    expect(result.order.trackingEvents[0]).toMatchObject({
      status: "shipped",
      message: "On the way",
      location: "Jaipur",
    });
    expect(result.order.shipmentSummary).toMatchObject({
      carrierName: "Ekart",
      trackingNumber: "AWB-USER-001",
      currentStatus: "shipped",
      latestStepMessage: "On the way",
    });
  });

  it("includes shipmentSummary on order list rows", async () => {
    await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-USER-002",
    });

    await createTrackingEvent(orderNo, {
      status: "in_transit",
      message: "In transit",
      eventAt: new Date("2026-05-26T09:00:00.000Z"),
    });

    const list = await listUserOrders(userId, { page: 1, limit: 10 });

    expect(list.ok).toBe(true);
    expect(list.orders[0].shipmentSummary).toMatchObject({
      carrierName: "Ekart",
      trackingNumber: "AWB-USER-002",
      currentStatus: "in_transit",
      latestStepMessage: "In transit",
    });
  });
});
