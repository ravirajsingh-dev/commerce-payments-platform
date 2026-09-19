jest.mock("../../../modules/commerce/order/orderEmails", () => ({
  scheduleOrderShippedEmail: jest.fn(),
  scheduleOrderPlacedEmail: jest.fn(),
}));

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Order = require("../../../models/Order");
const Shipment = require("../../../models/Shipment");
const TrackingEvent = require("../../../models/TrackingEvent");
const Carrier = require("../../../models/Carrier");
const User = require("../../../models/User");
const { testOrderAmounts } = require("../../helpers/orderAmounts");
const {
  createShipment,
  createTrackingEvent,
  updateTrackingEvent,
  deleteTrackingEvent,
  syncShipmentSummary,
  DELETE_CONFIRMATION_TEXT,
} = require("../../../modules/commerce/order/shipment/shipmentService");

describe("tracking event shipment summary sync (Phase 3)", () => {
  let mongoServer;
  let orderId;
  let orderNo;
  let carrierId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "tracking-event-sync-tests",
    });

    const user = await User.create({
      name: "Sync User",
      phone: "9123456702",
      email: "sync-user@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });

    const carrier = await Carrier.create({
      name: "BlueDart",
      slug: "bluedart-sync",
      trackingUrl: "https://track.example/{trackingNumber}",
      isActive: true,
    });
    carrierId = carrier._id;

    orderNo = "RJ250526SYNC01";
    const order = await Order.create({
      orderNo,
      userId: user._id,
      status: "order_placed",
      paymentStatus: "cod_pending",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 1000, total: 1000 }),
      addressSnapshot: {
        fullName: "Sync User",
        phone: "9123456702",
        addressLine1: "1 Road",
        city: "Jaipur",
        state: "Rajasthan",
        pincode: "302001",
        country: "IN",
      },
    });
    orderId = order._id;
  });

  afterEach(async () => {
    await TrackingEvent.deleteMany({});
    await Shipment.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("keeps shipment summary null when no tracking events exist", async () => {
    const created = await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-SYNC-001",
    });
    expect(created.ok).toBe(true);
    expect(created.shipment.currentStatus).toBeNull();

    const shipment = await Shipment.findOne({ orderId }).lean();
    expect(shipment.currentStatus).toBeNull();
    expect(shipment.latestStepMessage).toBeNull();
  });

  it("updates summary from the latest eventAt", async () => {
    await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-SYNC-002",
    });

    await createTrackingEvent(orderNo, {
      status: "packed",
      message: "Packed at warehouse",
      location: "Jaipur WH",
      eventAt: new Date("2026-05-20T10:00:00.000Z"),
    });

    await createTrackingEvent(orderNo, {
      status: "in_transit",
      message: "Left hub",
      location: "Delhi hub",
      eventAt: new Date("2026-05-21T12:00:00.000Z"),
    });

    const shipment = await Shipment.findOne({ orderId }).lean();
    expect(shipment).toMatchObject({
      currentStatus: "in_transit",
      latestStepMessage: "Left hub",
      latestStepLocation: "Delhi hub",
    });
    expect(shipment.latestStepAt).toEqual(new Date("2026-05-21T12:00:00.000Z"));
  });

  it("recomputes summary after edit and clears it when all events are deleted", async () => {
    await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-SYNC-003",
    });

    const first = await createTrackingEvent(orderNo, {
      status: "shipped",
      message: "Shipped",
      eventAt: new Date("2026-05-22T08:00:00.000Z"),
    });

    const updated = await updateTrackingEvent(orderNo, first.event.id, {
      status: "hub_received",
      message: "Received at hub",
      eventAt: new Date("2026-05-22T09:00:00.000Z"),
    });
    expect(updated.ok).toBe(true);

    let shipment = await Shipment.findOne({ orderId }).lean();
    expect(shipment.currentStatus).toBe("hub_received");

    await deleteTrackingEvent(orderNo, first.event.id, {
      transactionConfirmed: true,
      confirmationText: DELETE_CONFIRMATION_TEXT,
      deleteReason: "Cleanup obsolete event",
    });

    shipment = await Shipment.findOne({ orderId }).lean();
    expect(shipment.currentStatus).toBeNull();
    expect(shipment.latestStepMessage).toBeNull();
  });

  it("syncShipmentSummary is idempotent for empty event sets", async () => {
    const created = await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-SYNC-004",
    });

    const shipment = await Shipment.findById(created.shipment.id);
    await syncShipmentSummary(shipment._id);

    const refreshed = await Shipment.findById(shipment._id).lean();
    expect(refreshed.currentStatus).toBeNull();
  });
});
