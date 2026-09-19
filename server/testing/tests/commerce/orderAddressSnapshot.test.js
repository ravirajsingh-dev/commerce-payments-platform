const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Order = require("../../../models/Order");
const { testOrderAmounts } = require("../../helpers/orderAmounts");
const { validateAndNormalizeOrderAddressSnapshot } = require("../../../modules/commerce/address/validateCheckoutAddress");

describe("Order.addressSnapshot (Phase 5)", () => {
  let mongoServer;
  const userId = new mongoose.Types.ObjectId();

  const validSnapshot = {
    fullName: "Ravi Raj Singh",
    phone: "9876543210",
    addressLine1: "12 MG Road",
    addressLine2: "Near City Mall",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    country: "IN",
  };

  const baseOrder = () => ({
    orderNo: `ORD-${Date.now()}`,
    userId,
    amounts: testOrderAmounts(),
  });

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-order-snapshot-tests",
    });
    await Order.syncIndexes();
  });

  afterEach(async () => {
    await Order.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("validateAndNormalizeOrderAddressSnapshot normalizes country default", () => {
    const { country, ...withoutCountry } = validSnapshot;
    const result = validateAndNormalizeOrderAddressSnapshot(withoutCountry);

    expect(result.valid).toBe(true);
    expect(result.snapshot.country).toBe("IN");
  });

  it("rejects snapshots with unknown fields", () => {
    const result = validateAndNormalizeOrderAddressSnapshot({
      ...validSnapshot,
      label: "Home",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "label")).toBe(true);
  });

  it("persists orders with a valid addressSnapshot sub-schema", async () => {
    const order = await Order.create({
      ...baseOrder(),
      addressSnapshot: validSnapshot,
    });

    expect(order.addressSnapshot.fullName).toBe(validSnapshot.fullName);
    expect(order.addressSnapshot.phone).toBe(validSnapshot.phone);
    expect(order.addressSnapshot.country).toBe("IN");
  });

  it("rejects order create when addressSnapshot is missing required fields", async () => {
    await expect(
      Order.create({
        ...baseOrder(),
        addressSnapshot: {
          fullName: "Ravi Raj Singh",
        },
      }),
    ).rejects.toThrow(/validation failed/i);
  });

  it("rejects order create when addressSnapshot has invalid phone", async () => {
    await expect(
      Order.create({
        ...baseOrder(),
        addressSnapshot: {
          ...validSnapshot,
          phone: "123456789a",
        },
      }),
    ).rejects.toThrow(/validation failed/i);
  });

  it("normalizes country on save when omitted from input", async () => {
    const { country, ...withoutCountry } = validSnapshot;
    const order = await Order.create({
      ...baseOrder(),
      addressSnapshot: withoutCountry,
    });

    expect(order.addressSnapshot.country).toBe("IN");
  });

  it("stores userAddressId when provided on snapshot", async () => {
    const savedAddressId = new mongoose.Types.ObjectId();
    const order = await Order.create({
      ...baseOrder(),
      addressSnapshot: {
        ...validSnapshot,
        userAddressId: savedAddressId,
      },
    });

    expect(order.addressSnapshot.userAddressId.toString()).toBe(
      savedAddressId.toString(),
    );
  });

  it("validates addressSnapshot on findOneAndUpdate", async () => {
    const order = await Order.create({
      ...baseOrder(),
      addressSnapshot: validSnapshot,
    });

    await expect(
      Order.findOneAndUpdate(
        { _id: order._id },
        {
          addressSnapshot: {
            ...validSnapshot,
            phone: "bad-phone",
          },
        },
        { returnDocument: "after" },
      ),
    ).rejects.toThrow(/validation failed/i);
  });
});
