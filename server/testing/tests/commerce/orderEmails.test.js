const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Order = require("../../../models/Order");
const { testOrderAmounts } = require("../../helpers/orderAmounts");
const User = require("../../../models/User");
const {
  sendOrderPlacedEmail,
  sendOrderShippedEmail,
  buildOrderDetailUrl,
} = require("../../../modules/commerce/order/orderEmails");
const { updateAdminOrder } = require("../../../modules/commerce/order/orderAdminService");

jest.mock("../../../infra/email/index", () => ({
  sendEmail: jest.fn(),
  sendForgotPasswordOtpEmail: jest.fn(),
  sendOrderPlacedEmail: jest.fn().mockResolvedValue({ success: true, messageId: "placed-1" }),
  sendOrderShippedEmail: jest.fn().mockResolvedValue({ success: true, messageId: "shipped-1" }),
  verifyConnection: jest.fn(),
}));

const emailService = require("../../../infra/email/index");

describe("order emails (Phase 24)", () => {
  let mongoServer;
  let userId;
  let orderId;

  const addressSnapshot = {
    fullName: "Email Test User",
    phone: "9876543210",
    addressLine1: "1 Test Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    country: "IN",
  };

  beforeAll(async () => {
    process.env.ALLOWED_ORIGINS = "http://localhost:3000,http://localhost:3001";
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-order-emails-tests",
    });

    const user = await User.create({
      name: "Order Email User",
      phone: "9123456701",
      email: "order-email-user@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = user._id;

    const order = await Order.create({
      orderNo: "RJ250519MAIL01",
      userId,
      status: "order_placed",
      paymentStatus: "cod_pending",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 5000, total: 5000 }),
      addressSnapshot,
    });
    orderId = order._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("buildOrderDetailUrl uses storefront origin from ALLOWED_ORIGINS", () => {
    expect(buildOrderDetailUrl("RJ250519MAIL01")).toBe(
      "http://localhost:3000/user/orders/RJ250519MAIL01",
    );
  });

  it("sendOrderPlacedEmail uses existing Brevo email service", async () => {
    const order = await Order.findById(orderId).lean();

    const result = await sendOrderPlacedEmail(order, userId);

    expect(result.success).toBe(true);
    expect(emailService.sendOrderPlacedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "order-email-user@example.com",
        orderNo: "RJ250519MAIL01",
        orderTotal: 5000,
        paymentMethod: "cod",
        ordersUrl: "http://localhost:3000/user/orders/RJ250519MAIL01",
      }),
    );
  });

  it("sendOrderShippedEmail notifies the customer", async () => {
    const order = await Order.findByIdAndUpdate(
      orderId,
      { $set: { status: "shipped" } },
      { returnDocument: "after" },
    ).lean();

    const result = await sendOrderShippedEmail(order, userId);

    expect(result.success).toBe(true);
    expect(emailService.sendOrderShippedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "order-email-user@example.com",
        orderNo: "RJ250519MAIL01",
        ordersUrl: "http://localhost:3000/user/orders/RJ250519MAIL01",
      }),
    );
  });

  it("updateAdminOrder to shipped triggers shipped email once", async () => {
    await Order.findByIdAndUpdate(orderId, {
      $set: { status: "order_confirmed" },
    });

    const result = await updateAdminOrder("RJ250519MAIL01", { status: "shipped" }, {
      actorId: new mongoose.Types.ObjectId(),
    });

    expect(result.ok).toBe(true);

    await new Promise((resolve) => setImmediate(resolve));
    expect(emailService.sendOrderShippedEmail).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();

    await updateAdminOrder("RJ250519MAIL01", { paymentStatus: "paid" });
    await new Promise((resolve) => setImmediate(resolve));

    expect(emailService.sendOrderShippedEmail).not.toHaveBeenCalled();
  });
});
