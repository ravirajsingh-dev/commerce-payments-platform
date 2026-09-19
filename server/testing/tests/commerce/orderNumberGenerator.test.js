const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Order = require("../../../models/Order");
const { testOrderAmounts } = require("../../helpers/orderAmounts");
const CommonSettings = require("../../../models/CommonSettings");
const {
  generateOrderNo,
  buildOrderNo,
  formatDatePart,
  isValidOrderNoFormat,
  parseOrderNoParts,
  normalizeAbbreviation,
  ORDER_NUMBER_ERROR,
} = require("../../../modules/commerce/order/orderNumberGenerator");

describe("orderNumberGenerator", () => {
  let mongoServer;
  const userId = new mongoose.Types.ObjectId();
  const fixedDate = new Date("2026-05-16T12:00:00.000Z");
  const datePart = "260516";

  const validSnapshot = {
    fullName: "Ravi Raj Singh",
    phone: "9876543210",
    addressLine1: "12 MG Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    country: "IN",
  };

  const createOrderWithNo = async (orderNo) =>
    Order.create({
      orderNo,
      userId,
      amounts: testOrderAmounts({ items: 100, total: 100 }),
      addressSnapshot: validSnapshot,
    });

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-order-number-tests",
    });
    await Order.syncIndexes();
    await CommonSettings.getOrCreateSettings();
  });

  beforeEach(async () => {
    await CommonSettings.updateOne(
      {},
      { $set: { abbreviation: "RW" } },
      { upsert: true },
    );
  });

  afterEach(async () => {
    await Order.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("builds {ABBREV}{YYMMDD}{6 random} order numbers", () => {
    expect(buildOrderNo("RW", datePart, "8K2XQ1")).toBe("RW2605168K2XQ1");
    expect(formatDatePart(fixedDate)).toBe(datePart);
    expect(normalizeAbbreviation("  rajwada ")).toBe("RAJWADA");
  });

  it("validates order number format (suffix + date parsed from the right)", () => {
    expect(isValidOrderNoFormat("RW2605168K2XQ1")).toBe(true);
    expect(isValidOrderNoFormat("rw2605168k2xq1")).toBe(true);
    expect(isValidOrderNoFormat("RAJWADA2605168K2XQ1")).toBe(true);
    expect(isValidOrderNoFormat("ORD-123")).toBe(false);
    expect(isValidOrderNoFormat("RW2605168K2X")).toBe(false);
    expect(parseOrderNoParts("RW2605168K2XQ1")).toEqual({
      abbreviation: "RW",
      datePart: "260516",
      randomSuffix: "8K2XQ1",
    });
  });

  it("generates numbers using Application Settings abbreviation", async () => {
    const orderNo = await generateOrderNo({ date: fixedDate });
    expect(orderNo.startsWith("RW260516")).toBe(true);
    expect(orderNo).toHaveLength("RW".length + 6 + 6);
    expect(isValidOrderNoFormat(orderNo)).toBe(true);
  });

  it("uses updated abbreviation from settings", async () => {
    await CommonSettings.updateOne({}, { $set: { abbreviation: "RR" } });
    const orderNo = await generateOrderNo({ date: fixedDate });
    expect(orderNo.startsWith("RR260516")).toBe(true);
  });

  it("retries when a random suffix collides", async () => {
    await createOrderWithNo("RW260516ZZZZZZ");
    const orderNo = await generateOrderNo({ date: fixedDate });
    expect(orderNo).not.toBe("RW260516ZZZZZZ");
    expect(isValidOrderNoFormat(orderNo)).toBe(true);
  });

  it("generates unique numbers under concurrent requests", async () => {
    const results = await Promise.all(
      Array.from({ length: 25 }, () => generateOrderNo({ date: fixedDate })),
    );
    expect(new Set(results).size).toBe(25);
    results.forEach((orderNo) => {
      expect(orderNo.startsWith("RW260516")).toBe(true);
      expect(isValidOrderNoFormat(orderNo)).toBe(true);
    });
  });

  it("persists generated numbers as unique orders", async () => {
    const orderNo = await generateOrderNo({ date: fixedDate });
    const order = await createOrderWithNo(orderNo);

    expect(order.orderNo).toBe(orderNo);
    await expect(createOrderWithNo(orderNo)).rejects.toThrow();
  });

  it("falls back to application name when abbreviation is empty", async () => {
    await CommonSettings.updateOne(
      {},
      { $set: { abbreviation: "", name: "Rajwada" } },
    );
    const orderNo = await generateOrderNo({ date: fixedDate });
    expect(orderNo.startsWith("RAJWADA260516")).toBe(true);
  });

  it("throws when neither abbreviation nor name is usable", async () => {
    await CommonSettings.updateOne(
      {},
      { $set: { abbreviation: "", name: "   " } },
    );
    await expect(generateOrderNo({ date: fixedDate })).rejects.toMatchObject({
      code: ORDER_NUMBER_ERROR.ABBREVIATION_REQUIRED,
    });
  });
});
