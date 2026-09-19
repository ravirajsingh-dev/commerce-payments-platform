jest.mock("../../../modules/commerce/order/orderEmails", () => ({
  scheduleOrderPlacedEmail: jest.fn(),
  scheduleOrderShippedEmail: jest.fn(),
}));

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Cart = require("../../../models/Cart");
const CommonSettings = require("../../../models/CommonSettings");
const Order = require("../../../models/Order");
const OrderItem = require("../../../models/OrderItem");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const cartService = require("../../../modules/commerce/cart/cartService");
const { previewCheckout } = require("../../../modules/commerce/checkout/checkoutPreviewService");
const { placeOrder } = require("../../../modules/commerce/checkout/placeOrderService");
const { computeOrderGst } = require("../../../modules/commerce/checkout/gstService");

describe("GST at checkout (Phase 3)", () => {
  let mongoServer;
  let userId;
  let variantId;

  const shippingAddress = {
    fullName: "GST User",
    phone: "9876543210",
    addressLine1: "12 MG Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    country: "IN",
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-gst-checkout-tests",
    });

    userId = new mongoose.Types.ObjectId().toString();

    const category = await Category.create({
      name: "Sherwanis",
      slug: "sherwanis-gst",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-gst",
      status: 1,
    });
    const product = await Product.create({
      name: "GST Sherwani",
      slug: "gst-sherwani",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });

    const variant = await ProductVariant.create({
      productId: product._id,
      sku: "GST-01",
      attributes: { color: "gold" },
      price: 2000,
      sizes: [],
    });
    variantId = variant._id;
    await Inventory.create({
      productVariantId: variantId,
      stock: 10,
    });
  });

  beforeEach(async () => {
    const settings = await CommonSettings.getOrCreateSettings();
    settings.gstin = "22AAAAA0000A1Z5";
    settings.defaultGstRate = 18;
    settings.flatShippingFee = 100;
    await settings.save();
  });

  afterEach(async () => {
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await OrderItem.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("computeOrderGst applies rate on taxable amount excluding shipping", () => {
    const result = computeOrderGst({
      subtotal: 2000,
      discountTotal: 200,
      shippingTotal: 100,
      gstRate: 18,
      gstin: "22AAAAA0000A1Z5",
      lines: [{ variantId: "v1", size: "", lineTotal: 2000 }],
    });

    expect(result).toMatchObject({
      taxableAmount: 1800,
      gstAmount: 324,
      gstRateSnapshot: 18,
      gstinSnapshot: "22AAAAA0000A1Z5",
      grandTotal: 2224,
    });
  });

  it("includes GST in checkout preview when rate is configured", async () => {
    await cartService.addCartItem(userId, {
      variantId: String(variantId),
      qty: 1,
    });

    const preview = await previewCheckout(userId);
    expect(preview.ok).toBe(true);
    expect(preview.preview.amounts).toMatchObject({
      items: 2000,
      discount: 0,
      shipping: 100,
      gst: 360,
      total: 2460,
    });
  });

  it("persists GST fields on order and line items at place order", async () => {
    await cartService.addCartItem(userId, {
      variantId: String(variantId),
      qty: 2,
    });

    const placed = await placeOrder(userId, {
      ...shippingAddress,
      paymentMethod: "cod",
    });

    expect(placed.ok).toBe(true);
    expect(placed.order.amounts).toMatchObject({
      items: 4000,
      shipping: 100,
      gst: 720,
      total: 4820,
    });

    const order = await Order.findOne({ orderNo: placed.order.orderNo }).lean();
    expect(order.amounts.gst).toBe(720);
    expect(order.amounts.total).toBe(4820);

    const items = await OrderItem.find({ orderId: order._id }).lean();
    expect(items).toHaveLength(1);
    expect(items[0].lineTotal).toBe(4000);
  });

  it("uses zero GST when defaultGstRate is 0", async () => {
    const settings = await CommonSettings.getOrCreateSettings();
    settings.defaultGstRate = 0;
    await settings.save();

    await cartService.addCartItem(userId, {
      variantId: String(variantId),
      qty: 1,
    });

    const preview = await previewCheckout(userId);
    expect(preview.preview.amounts).toMatchObject({
      gst: 0,
      total: 2100,
    });
  });
});
