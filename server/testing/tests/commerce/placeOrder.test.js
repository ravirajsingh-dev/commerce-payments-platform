const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const fs = require("fs");
const path = require("path");

const Cart = require("../../../models/Cart");
const Order = require("../../../models/Order");
const OrderItem = require("../../../models/OrderItem");
const UserAddress = require("../../../models/UserAddress");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const cartService = require("../../../modules/commerce/cart/cartService");
const {
  placeOrder,
  PLACE_ORDER_ERROR,
} = require("../../../modules/commerce/checkout/placeOrderService");
const { isValidOrderNoFormat } = require("../../../modules/commerce/order/orderNumberGenerator");

describe("place order API (Phase 14)", () => {
  let mongoServer;
  let userId;
  let legacyVariantId;
  let productId;

  const shippingAddress = {
    fullName: "Ravi Raj Singh",
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
      dbName: "commerce-place-order-tests",
    });

    userId = new mongoose.Types.ObjectId().toString();

    const category = await Category.create({
      name: "Sherwanis",
      slug: "sherwanis",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-place-order",
      status: 1,
    });
    const product = await Product.create({
      name: "Royal Sherwani",
      slug: "royal-sherwani",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });
    productId = product._id;

    const legacyVariant = await ProductVariant.create({
      productId,
      sku: "PLACE-LEGACY-01",
      attributes: { color: "ivory" },
      price: 2000,
      sizes: [],
    });
    legacyVariantId = legacyVariant._id;
    await Inventory.create({
      productVariantId: legacyVariantId,
      stock: 5,
    });
  });

  afterEach(async () => {
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await OrderItem.deleteMany({});
    await UserAddress.deleteMany({});
    await Inventory.findOneAndUpdate(
      { productVariantId: legacyVariantId },
      { $set: { stock: 5 } },
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("places a COD order, decrements stock, and clears the cart", async () => {
    await cartService.addCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 2,
    });

    const result = await placeOrder(userId, {
      ...shippingAddress,
      paymentMethod: "cod",
    });

    expect(result.ok).toBe(true);
    expect(isValidOrderNoFormat(result.order.orderNo)).toBe(true);
    expect(result.order).toMatchObject({
      status: "order_placed",
      paymentStatus: "cod_pending",
      paymentMethod: "cod",
      amounts: {
        items: 4000,
        discount: 0,
        shipping: 0,
        gst: 0,
        total: 4000,
      },
    });
    expect(result.order.addressSnapshot.fullName).toBe(shippingAddress.fullName);
    expect(result.order.items).toHaveLength(1);
    expect(result.order.items[0]).toMatchObject({
      variantId: String(legacyVariantId),
      quantity: 2,
      unitPriceSnapshot: 2000,
      lineTotal: 4000,
      skuSnapshot: "PLACE-LEGACY-01",
      productSlugSnapshot: "royal-sherwani",
    });

    const inventory = await Inventory.findOne({
      productVariantId: legacyVariantId,
    }).lean();
    expect(inventory.stock).toBe(3);

    const cart = await Cart.findOne({ userId }).lean();
    expect(cart.items).toHaveLength(0);

    const orders = await Order.countDocuments({ userId });
    expect(orders).toBe(1);
  });

  it("places an order using a saved user address id", async () => {
    const saved = await UserAddress.create({
      userId,
      label: "Home",
      ...shippingAddress,
      isDefault: true,
    });

    await cartService.addCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 1,
    });

    const result = await placeOrder(userId, {
      userAddressId: String(saved._id),
    });

    expect(result.ok).toBe(true);
    expect(String(result.order.addressSnapshot.userAddressId)).toBe(
      String(saved._id),
    );
  });

  it("rejects unsupported payment methods", async () => {
    await cartService.addCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 1,
    });

    const result = await placeOrder(userId, {
      ...shippingAddress,
      paymentMethod: "razorpay",
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe(PLACE_ORDER_ERROR.INVALID_PAYMENT_METHOD);
  });

  it("rejects when cart has insufficient stock", async () => {
    await cartService.addCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 4,
    });

    await Inventory.findOneAndUpdate(
      { productVariantId: legacyVariantId },
      { $set: { stock: 1 } },
    );

    const result = await placeOrder(userId, shippingAddress);

    expect(result.ok).toBe(false);
    expect(result.code).toBe(PLACE_ORDER_ERROR.CHECKOUT_BLOCKED);
  });

  it("mounts POST /api/checkout/place behind UserAuth", () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        "../../../modules/commerce/checkout/checkoutRoutes.js",
      ),
      "utf8",
    );

    expect(source).toContain('"/place"');
    expect(source).toContain("placeOrderHandler");
    expect(source).toContain("UserAuth");
  });
});
