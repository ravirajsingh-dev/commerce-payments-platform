const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Order = require("../../../models/Order");
const { testOrderAmounts } = require("../../helpers/orderAmounts");
const OrderItem = require("../../../models/OrderItem");
const User = require("../../../models/User");
const CommonSettings = require("../../../models/CommonSettings");
const {
  getUserOrderInvoiceDownload,
  INVOICE_DOWNLOAD_ERROR,
} = require("../../../modules/commerce/order/invoice/orderInvoiceDownloadService");
const { isValidOrderNoFormat } = require("../../../modules/commerce/order/orderNumberGenerator");

describe("order invoice download API (Phase 57)", () => {
  let mongoServer;
  let userId;
  let otherUserId;
  let pendingOrderNo;
  let processingOrderNo;
  let deliveredOrderNo;

  const addressSnapshot = {
    fullName: "Test User",
    phone: "9876543210",
    addressLine1: "1 Test Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    country: "IN",
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-order-invoice-download-tests",
    });

    await CommonSettings.getOrCreateSettings();

    const user = await User.create({
      name: "Invoice Download User",
      phone: "9123456799",
      email: "invoice-download@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    const other = await User.create({
      name: "Other User",
      phone: "9123456798",
      email: "invoice-download-other@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = String(user._id);
    otherUserId = String(other._id);

    pendingOrderNo = "RJ250519INV0A1";
    processingOrderNo = "RJ250519INV0B2";
    deliveredOrderNo = "RJ250519INV0C3";
    expect(isValidOrderNoFormat(pendingOrderNo)).toBe(true);
    expect(isValidOrderNoFormat(processingOrderNo)).toBe(true);
    expect(isValidOrderNoFormat(deliveredOrderNo)).toBe(true);

    const pendingOrder = await Order.create({
      orderNo: pendingOrderNo,
      userId: user._id,
      status: "order_placed",
      paymentStatus: "cod_pending",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 5000, total: 5000 }),
      addressSnapshot,
    });

    const processingOrder = await Order.create({
      orderNo: processingOrderNo,
      userId: user._id,
      status: "order_confirmed",
      paymentStatus: "cod_pending",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 212999, total: 212999 }),
      addressSnapshot,
    });

    const deliveredOrder = await Order.create({
      orderNo: deliveredOrderNo,
      userId: user._id,
      status: "delivered",
      paymentStatus: "paid",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 212999, total: 212999 }),
      addressSnapshot,
    });

    await OrderItem.insertMany([
      {
        orderId: pendingOrder._id,
        productId: new mongoose.Types.ObjectId(),
        productVariantId: new mongoose.Types.ObjectId(),
        productNameSnapshot: "Pending Product",
        productSlugSnapshot: "pending-product",
        skuSnapshot: "PENDING-SKU",
        quantity: 1,
        unitPriceSnapshot: 5000,
        lineTotal: 5000,
      },
      {
        orderId: processingOrder._id,
        productId: new mongoose.Types.ObjectId(),
        productVariantId: new mongoose.Types.ObjectId(),
        productNameSnapshot: "BORDEAUX BANDHGALA SUIT",
        productSlugSnapshot: "bordeaux-suit",
        skuSnapshot: "RAJW-MW-29227-MRNWOO-S-MP5A6JHV7D",
        size: "xl",
        quantity: 1,
        unitPriceSnapshot: 212999,
        lineTotal: 212999,
      },
      {
        orderId: deliveredOrder._id,
        productId: new mongoose.Types.ObjectId(),
        productVariantId: new mongoose.Types.ObjectId(),
        productNameSnapshot: "Delivered Product",
        productSlugSnapshot: "delivered-product",
        skuSnapshot: "DELIVERED-SKU",
        quantity: 1,
        unitPriceSnapshot: 212999,
        lineTotal: 212999,
      },
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("rejects invoice download for pending orders", async () => {
    const result = await getUserOrderInvoiceDownload(userId, pendingOrderNo);

    expect(result.ok).toBe(false);
    expect(result.code).toBe(INVOICE_DOWNLOAD_ERROR.NOT_ELIGIBLE);
    expect(result.statusCode).toBe(403);
    expect(result.pdfBuffer).toBeUndefined();
  });

  it("rejects invoice download for processing orders", async () => {
    const result = await getUserOrderInvoiceDownload(userId, processingOrderNo);

    expect(result.ok).toBe(false);
    expect(result.code).toBe(INVOICE_DOWNLOAD_ERROR.NOT_ELIGIBLE);
    expect(result.statusCode).toBe(403);
  });

  it("generates PDF in memory for delivered orders (no storage)", async () => {
    const result = await getUserOrderInvoiceDownload(userId, deliveredOrderNo);

    expect(result.ok).toBe(true);
    expect(Buffer.isBuffer(result.pdfBuffer)).toBe(true);
    expect(result.pdfBuffer.slice(0, 4).toString()).toBe("%PDF");
    expect(result.fileName).toBe("RJ250519INV0C3.pdf");
    expect(result.downloadUrl).toBeUndefined();
  });

  it("returns 404 for another user's order", async () => {
    const result = await getUserOrderInvoiceDownload(otherUserId, processingOrderNo);

    expect(result.ok).toBe(false);
    expect(result.code).toBe(INVOICE_DOWNLOAD_ERROR.NOT_FOUND);
    expect(result.statusCode).toBe(404);
  });

  it("returns 400 for invalid order number format", async () => {
    const result = await getUserOrderInvoiceDownload(userId, "not-an-order");

    expect(result.ok).toBe(false);
    expect(result.code).toBe(INVOICE_DOWNLOAD_ERROR.INVALID_ORDER_NO);
    expect(result.statusCode).toBe(400);
  });
});
