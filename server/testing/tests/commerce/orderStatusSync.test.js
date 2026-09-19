const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Order = require("../../../models/Order");
const Carrier = require("../../../models/Carrier");
const User = require("../../../models/User");
const { testOrderAmounts } = require("../../helpers/orderAmounts");

const mockScheduleOrderShippedEmail = jest.fn();

jest.mock("../../../modules/commerce/order/orderEmails", () => ({
  scheduleOrderShippedEmail: (...args) => mockScheduleOrderShippedEmail(...args),
  scheduleOrderPlacedEmail: jest.fn(),
}));

const {
  createShipment,
  createTrackingEvent,
  deleteTrackingEvent,
  DELETE_CONFIRMATION_TEXT,
} = require("../../../modules/commerce/order/shipment/shipmentService");

describe("order status sync from tracking events (Phase 3)", () => {
  let mongoServer;
  let orderId;
  let orderNo;
  let carrierId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "order-status-sync-tests",
    });

    const user = await User.create({
      name: "Status Sync User",
      phone: "9123456703",
      email: "status-sync@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });

    const carrier = await Carrier.create({
      name: "Delhivery",
      slug: "delhivery-status-sync",
      trackingUrl: "https://carrier.example/track/{awb}",
      isActive: true,
    });
    carrierId = carrier._id;

    orderNo = "RJ250526STAT01";
    const order = await Order.create({
      orderNo,
      userId: user._id,
      status: "order_placed",
      paymentStatus: "cod_pending",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 2000, total: 2000 }),
      addressSnapshot: {
        fullName: "Status Sync User",
        phone: "9123456703",
        addressLine1: "2 Road",
        city: "Jaipur",
        state: "Rajasthan",
        pincode: "302001",
        country: "IN",
      },
    });
    orderId = order._id;
  });

  beforeEach(() => {
    mockScheduleOrderShippedEmail.mockClear();
  });

  afterEach(async () => {
    await mongoose.model("tracking_events").deleteMany({});
    await mongoose.model("shipments").deleteMany({});
    await Order.updateOne(
      { _id: orderId },
      { $set: { status: "order_placed", paymentStatus: "cod_pending" } },
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("sets order.status to the latest tracking event status", async () => {
    await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-STAT-001",
    });

    await createTrackingEvent(orderNo, {
      status: "packed",
      message: "Packed",
      eventAt: new Date("2026-05-23T10:00:00.000Z"),
    });

    await createTrackingEvent(orderNo, {
      status: "hub_received",
      message: "At hub",
      eventAt: new Date("2026-05-24T10:00:00.000Z"),
    });

    const order = await Order.findById(orderId).lean();
    expect(order.status).toBe("hub_received");
  });

  it("schedules shipped email with carrier details when status becomes shipped", async () => {
    await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-STAT-SHIP",
    });

    await createTrackingEvent(orderNo, {
      status: "shipped",
      message: "Dispatched",
      eventAt: new Date("2026-05-25T10:00:00.000Z"),
    });

    const order = await Order.findById(orderId).lean();
    expect(order.status).toBe("shipped");
    expect(mockScheduleOrderShippedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ orderNo, status: "shipped" }),
      "order_placed",
      expect.objectContaining({
        carrierName: "Delhivery",
        trackingNumber: "AWB-STAT-SHIP",
        carrierTrackingUrl: "https://carrier.example/track/AWB-STAT-SHIP",
      }),
    );
  });

  it("does not change order.status when all tracking events are removed", async () => {
    await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-STAT-002",
    });

    const created = await createTrackingEvent(orderNo, {
      status: "in_transit",
      message: "Moving",
      eventAt: new Date("2026-05-25T11:00:00.000Z"),
    });

    await deleteTrackingEvent(orderNo, created.event.id, {
      transactionConfirmed: true,
      confirmationText: DELETE_CONFIRMATION_TEXT,
      deleteReason: "Remove temporary test event",
    });

    const order = await Order.findById(orderId).lean();
    expect(order.status).toBe("in_transit");
  });

  it("sets paymentStatus to cod_paid when COD order becomes delivered", async () => {
    await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-STAT-DELIV",
    });

    await createTrackingEvent(orderNo, {
      status: "out_for_delivery",
      message: "Out for delivery",
      eventAt: new Date("2026-05-26T09:00:00.000Z"),
    });

    await createTrackingEvent(orderNo, {
      status: "delivered",
      message: "Delivered",
      eventAt: new Date("2026-05-26T12:00:00.000Z"),
    });

    const order = await Order.findById(orderId).lean();
    expect(order.status).toBe("delivered");
    expect(order.paymentStatus).toBe("cod_paid");
  });
});
