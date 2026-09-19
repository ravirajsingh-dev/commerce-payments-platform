const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Order = require("../../../models/Order");
const User = require("../../../models/User");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const CommonSettings = require("../../../models/CommonSettings");
const cartService = require("../../../modules/commerce/cart/cartService");
const { placeOrder } = require("../../../modules/commerce/checkout/placeOrderService");
const {
  buildInvoicePdfBuffer,
  buildInvoiceAmounts,
  formatInr,
} = require("../../../modules/commerce/order/invoice/invoicePdfBuilder");

describe("order invoice PDF (Phase 23)", () => {
  let mongoServer;
  let userId;
  let variantId;

  const shippingAddress = {
    fullName: "Invoice Customer",
    phone: "9876543210",
    addressLine1: "1 Palace Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    country: "IN",
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-order-invoice-tests",
    });

    const user = await User.create({
      name: "Invoice User",
      phone: "9123456789",
      email: "invoice-user@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = String(user._id);

    const category = await Category.create({
      name: "Sherwanis",
      slug: "sherwanis-invoice",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-invoice",
      status: 1,
    });
    const product = await Product.create({
      name: "Invoice Sherwani",
      slug: "invoice-sherwani",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });
    const variant = await ProductVariant.create({
      productId: product._id,
      sku: "INV-SKU-01",
      attributes: { color: "gold" },
      price: 5000,
      sizes: [],
    });
    variantId = String(variant._id);
    await Inventory.create({
      productVariantId: variant._id,
      stock: 20,
    });

    await CommonSettings.getOrCreateSettings();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  const placeTestOrder = async () => {
    await cartService.addCartItem(userId, {
      variantId,
      qty: 2,
    });
    const result = await placeOrder(userId, {
      paymentMethod: "cod",
      ...shippingAddress,
    });
    expect(result.ok).toBe(true);
    return result.order;
  };

  it("formatInr prefixes amounts with rupee symbol", () => {
    expect(formatInr(212999)).toBe("₹2,12,999.00");
  });

  it("buildInvoiceAmounts maps nested order amounts", () => {
    const amounts = buildInvoiceAmounts({
      amounts: {
        items: 10000,
        discount: 0,
        shipping: 150,
        gst: 0,
        total: 10150,
      },
    });

    expect(amounts).toEqual({
      items: 10000,
      discount: 0,
      gst: 0,
      shipping: 150,
      total: 10150,
    });
  });

  it("buildInvoicePdfBuffer returns a valid PDF buffer", async () => {
    const placed = await placeTestOrder();
    const order = await Order.findOne({ orderNo: placed.orderNo }).lean();
    const items = [
      {
        productNameSnapshot: "Invoice Sherwani",
        skuSnapshot: "INV-SKU-01",
        quantity: 2,
        unitPriceSnapshot: 5000,
        lineTotal: 10000,
        size: "",
      },
    ];
    const settings = await CommonSettings.getOrCreateSettings();

    const buffer = await buildInvoicePdfBuffer({
      order: { ...order, status: "order_confirmed" },
      items,
      settings,
      customer: { email: "invoice-user@example.com" },
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.slice(0, 4).toString()).toBe("%PDF");
  });

  it("place order persists amounts on Order", async () => {
    const placed = await placeTestOrder();
    const order = await Order.findOne({ orderNo: placed.orderNo }).lean();

    expect(order.amounts).toMatchObject({
      items: expect.any(Number),
      gst: expect.any(Number),
      total: expect.any(Number),
    });
  });
});
