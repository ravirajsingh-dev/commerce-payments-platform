jest.mock("../../../modules/commerce/order/orderEmails", () => ({
  scheduleOrderShippedEmail: jest.fn(),
  scheduleOrderPlacedEmail: jest.fn(),
}));

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const fs = require("fs");
const path = require("path");

const Order = require("../../../models/Order");
const Shipment = require("../../../models/Shipment");
const TrackingEvent = require("../../../models/TrackingEvent");
const Carrier = require("../../../models/Carrier");
const User = require("../../../models/User");
const { testOrderAmounts } = require("../../helpers/orderAmounts");
const {
  getShipmentByOrderNo,
  createShipment,
  updateShipment,
  listTrackingEvents,
  createTrackingEvent,
  deleteTrackingEvent,
  DELETE_CONFIRMATION_TEXT,
  SHIPMENT_ERROR,
} = require("../../../modules/commerce/order/shipment/shipmentService");

describe("admin shipment API service (Phase 3)", () => {
  let mongoServer;
  let orderNo;
  let carrierId;
  let inactiveCarrierId;
  let userId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "shipment-admin-tests",
    });

    const user = await User.create({
      name: "Admin Shipment User",
      phone: "9123456704",
      email: "shipment-admin@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = user._id;

    const carrier = await Carrier.create({
      name: "DTDC",
      slug: "dtdc-admin",
      trackingUrl: "https://dtdc.example/{trackingNumber}",
      isActive: true,
    });
    carrierId = carrier._id;

    const inactive = await Carrier.create({
      name: "Inactive Carrier",
      slug: "inactive-admin",
      trackingUrl: "https://inactive.example",
      isActive: false,
    });
    inactiveCarrierId = inactive._id;

    orderNo = "RJ250526ADMIN1";
    await Order.create({
      orderNo,
      userId: user._id,
      status: "order_confirmed",
      paymentStatus: "cod_pending",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 3000, total: 3000 }),
      addressSnapshot: {
        fullName: "Admin Shipment User",
        phone: "9123456704",
        addressLine1: "3 Road",
        city: "Jaipur",
        state: "Rajasthan",
        pincode: "302001",
        country: "IN",
      },
    });
  });

  afterEach(async () => {
    await TrackingEvent.deleteMany({});
    await Shipment.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("creates and returns shipment with carrier tracking URL", async () => {
    const result = await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-ADMIN-001",
      estimatedDeliveryDate: "2026-05-30T00:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    expect(result.shipment).toMatchObject({
      orderNo,
      carrierName: "DTDC",
      trackingNumber: "AWB-ADMIN-001",
      carrierTrackingUrl: "https://dtdc.example/{trackingNumber}",
      currentStatus: null,
    });

    const fetched = await getShipmentByOrderNo(orderNo);
    expect(fetched.ok).toBe(true);
    expect(fetched.shipment.trackingNumber).toBe("AWB-ADMIN-001");
  });

  it("rejects duplicate shipment assignment", async () => {
    await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-ADMIN-002",
    });

    const duplicate = await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-ADMIN-003",
    });

    expect(duplicate.ok).toBe(false);
    expect(duplicate.code).toBe(SHIPMENT_ERROR.SHIPMENT_EXISTS);
    expect(duplicate.statusCode).toBe(409);
  });

  it("rejects inactive carrier and cancelled status on events", async () => {
    await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-ADMIN-004",
    });

    const inactive = await updateShipment(orderNo, {
      carrierId: String(inactiveCarrierId),
    });
    expect(inactive.ok).toBe(false);
    expect(inactive.code).toBe(SHIPMENT_ERROR.INVALID_CARRIER);

    const badStatus = await createTrackingEvent(orderNo, {
      status: "cancelled",
      message: "Should fail",
      eventAt: new Date(),
    });
    expect(badStatus.ok).toBe(false);
    expect(badStatus.code).toBe(SHIPMENT_ERROR.INVALID_STATUS);
  });

  it("supports offline carrier without AWB and direct delivered status", async () => {
    const offlineCarrier = await Carrier.create({
      name: "Showroom pickup",
      slug: "showroom-pickup-admin",
      trackingUrl: "",
      fulfillmentMode: "offline",
      isActive: true,
    });

    const offlineOrderNo = "RJ250526OFFL01";
    await Order.create({
      orderNo: offlineOrderNo,
      userId,
      status: "order_placed",
      paymentStatus: "cod_pending",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 1500, total: 1500 }),
      addressSnapshot: {
        fullName: "Offline Pickup",
        phone: "9123456704",
        addressLine1: "Showroom",
        city: "Jaipur",
        state: "Rajasthan",
        pincode: "302001",
        country: "IN",
      },
    });

    const created = await createShipment(offlineOrderNo, {
      fulfillmentMode: "offline",
      carrierId: String(offlineCarrier._id),
      trackingNumber: "",
    });
    expect(created.ok).toBe(true);
    expect(created.shipment.trackingNumber).toBe(offlineOrderNo);

    const delivered = await createTrackingEvent(offlineOrderNo, {
      status: "delivered",
      message: "Picked up from showroom",
      location: "Jaipur showroom",
      eventAt: new Date("2026-05-27T12:00:00.000Z"),
    });
    expect(delivered.ok).toBe(true);

    const order = await Order.findOne({ orderNo: offlineOrderNo }).lean();
    expect(order.status).toBe("delivered");
  });

  it("rejects impossible online status jumps while allowing normal progression", async () => {
    await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-ADMIN-ONLINE-01",
      fulfillmentMode: "online",
    });

    const invalid = await createTrackingEvent(orderNo, {
      status: "delivered",
      message: "Delivered directly",
      eventAt: new Date("2026-05-27T13:00:00.000Z"),
    });

    expect(invalid.ok).toBe(false);
    expect(invalid.code).toBe(SHIPMENT_ERROR.INVALID_STATUS);

    const valid = await createTrackingEvent(orderNo, {
      status: "shipped",
      message: "Dispatched from warehouse",
      eventAt: new Date("2026-05-27T14:00:00.000Z"),
    });

    expect(valid.ok).toBe(true);
  });

  it("lists tracking events with pagination", async () => {
    await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-ADMIN-005",
    });

    for (let i = 0; i < 3; i += 1) {
      await createTrackingEvent(orderNo, {
        status: "packed",
        message: `Event ${i}`,
        eventAt: new Date(`2026-05-2${i}T10:00:00.000Z`),
      });
    }

    const page1 = await listTrackingEvents(orderNo, { page: 1, limit: 2 });
    expect(page1.ok).toBe(true);
    expect(page1.events).toHaveLength(2);
    expect(page1.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
  });

  it("requires explicit confirmation and reason before deleting tracking event", async () => {
    await createShipment(orderNo, {
      carrierId: String(carrierId),
      trackingNumber: "AWB-ADMIN-DEL-01",
    });
    const created = await createTrackingEvent(orderNo, {
      status: "packed",
      message: "Packed",
      eventAt: new Date("2026-05-28T10:00:00.000Z"),
    });
    expect(created.ok).toBe(true);

    const rejected = await deleteTrackingEvent(orderNo, created.event.id);
    expect(rejected.ok).toBe(false);
    expect(rejected.code).toBe(SHIPMENT_ERROR.DELETE_CONFIRMATION_REQUIRED);

    const deleted = await deleteTrackingEvent(orderNo, created.event.id, {
      transactionConfirmed: true,
      confirmationText: DELETE_CONFIRMATION_TEXT,
      deleteReason: "Created by mistake",
    });
    expect(deleted.ok).toBe(true);
  });

  it("mounts admin shipment routes behind AdminAuth", () => {
    const adminRoutes = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/order/orderAdminRoutes.js"),
      "utf8",
    );
    const shipmentRoutes = fs.readFileSync(
      path.join(
        __dirname,
        "../../../modules/commerce/order/shipment/shipmentAdminRoutes.js",
      ),
      "utf8",
    );

    expect(adminRoutes).toContain("/:orderNo/shipment");
    expect(shipmentRoutes).toContain('"/events"');
    expect(shipmentRoutes).toContain("AdminAuth");
    expect(shipmentRoutes).toContain("createTrackingEvent");
  });
});
