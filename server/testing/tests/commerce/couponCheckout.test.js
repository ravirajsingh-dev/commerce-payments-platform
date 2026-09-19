jest.mock("../../../modules/commerce/order/orderEmails", () => ({
  scheduleOrderPlacedEmail: jest.fn(),
  scheduleOrderShippedEmail: jest.fn(),
}));

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Cart = require("../../../models/Cart");
const Coupon = require("../../../models/Coupon");
const CouponUsage = require("../../../models/CouponUsage");
const Order = require("../../../models/Order");
const OrderItem = require("../../../models/OrderItem");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const cartService = require("../../../modules/commerce/cart/cartService");
const {
  applyCouponToCart,
  removeCouponFromCart,
  validateCouponForSubtotal,
  calculateDiscountAmount,
  listAvailableCouponsForUser,
} = require("../../../modules/commerce/coupon/couponService");
const { previewCheckout } = require("../../../modules/commerce/checkout/checkoutPreviewService");
const { placeOrder } = require("../../../modules/commerce/checkout/placeOrderService");

describe("coupon validate + apply at checkout (Phase 2)", () => {
  let mongoServer;
  let userId;
  let variantId;

  const shippingAddress = {
    fullName: "Coupon User",
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
      dbName: "commerce-coupon-checkout-tests",
    });

    userId = new mongoose.Types.ObjectId().toString();

    const category = await Category.create({
      name: "Sherwanis",
      slug: "sherwanis-coupon",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-coupon",
      status: 1,
    });
    const product = await Product.create({
      name: "Coupon Sherwani",
      slug: "coupon-sherwani",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });

    const variant = await ProductVariant.create({
      productId: product._id,
      sku: "COUPON-01",
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

  afterEach(async () => {
    await Cart.deleteMany({});
    await Coupon.deleteMany({});
    await CouponUsage.deleteMany({});
    await Order.deleteMany({});
    await OrderItem.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("calculates percentage discount with cap", () => {
    const discount = calculateDiscountAmount(
      {
        discountType: "percentage",
        discountValue: 10,
        maxDiscountAmount: 150,
      },
      2000,
    );
    expect(discount).toBe(150);
  });

  it("applies coupon to cart and includes discount in preview", async () => {
    await Coupon.create({
      code: "SAVE10",
      title: "Save 10%",
      discountType: "percentage",
      discountValue: 10,
      minOrderAmount: 1000,
      usageLimit: 5,
      status: 1,
    });

    await cartService.addCartItem(userId, {
      variantId: String(variantId),
      qty: 2,
    });

    const applied = await applyCouponToCart(userId, "save10");
    expect(applied.ok).toBe(true);
    expect(applied.cart.couponCode).toBe("SAVE10");
    expect(applied.cart.discountTotal).toBe(400);
    expect(applied.cart.grandTotal).toBe(3600);

    const preview = await previewCheckout(userId);
    expect(preview.ok).toBe(true);
    expect(preview.preview).toMatchObject({
      amounts: {
        items: 4000,
        discount: 400,
        shipping: 0,
        total: 3600,
      },
      couponCode: "SAVE10",
      couponValid: true,
      canCheckout: true,
    });
  });

  it("enforces per-user usage limit", async () => {
    await Coupon.create({
      code: "ONCE",
      title: "Once per user",
      discountType: "flat",
      discountValue: 100,
      usageLimitPerUser: 1,
      status: 1,
    });

    await CouponUsage.create({
      couponId: (await Coupon.findOne({ code: "ONCE" }).lean())._id,
      userId: new mongoose.Types.ObjectId(userId),
      orderId: new mongoose.Types.ObjectId(),
      orderNo: "TEST-ONCE",
      code: "ONCE",
      discountAmount: 100,
    });

    await cartService.addCartItem(userId, {
      variantId: String(variantId),
      qty: 1,
    });

    const result = await validateCouponForSubtotal("ONCE", 2000, userId);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/usage limit/i);
  });

  it("lists available coupons with amount-short hint", async () => {
    await Coupon.create({
      code: "MIN5K",
      title: "Min 5k",
      discountType: "flat",
      discountValue: 200,
      minOrderAmount: 5000,
      termsAndConditions: "Valid on full-price items.",
      status: 1,
    });

    await cartService.addCartItem(userId, {
      variantId: String(variantId),
      qty: 1,
    });

    const result = await listAvailableCouponsForUser(userId, 2000);
    expect(result.ok).toBe(true);
    const offer = result.coupons.find((row) => row.code === "MIN5K");
    expect(offer).toBeDefined();
    expect(offer.canApply).toBe(false);
    expect(offer.amountShort).toBe(3000);
    expect(offer.actionHint).toMatch(/3,000 more/i);
    expect(offer.termsAndConditions).toBe("Valid on full-price items.");
  });

  it("rejects coupon below minimum order", async () => {
    await Coupon.create({
      code: "BIG500",
      title: "Big order",
      discountType: "flat",
      discountValue: 500,
      minOrderAmount: 10000,
      status: 1,
    });

    await cartService.addCartItem(userId, {
      variantId: String(variantId),
      qty: 1,
    });

    const result = await validateCouponForSubtotal("BIG500", 2000);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Minimum order/i);
  });

  it("removes coupon from cart", async () => {
    await Coupon.create({
      code: "FLAT50",
      title: "Flat 50",
      discountType: "flat",
      discountValue: 50,
      status: 1,
    });

    await cartService.addCartItem(userId, {
      variantId: String(variantId),
      qty: 1,
    });
    await applyCouponToCart(userId, "FLAT50");

    const removed = await removeCouponFromCart(userId);
    expect(removed.ok).toBe(true);
    expect(removed.cart.couponCode).toBe("");
    expect(removed.cart.discountTotal).toBe(0);
  });

  it("records CouponUsage and increments usedCount on place order", async () => {
    await Coupon.create({
      code: "SAVE20",
      title: "Save 20%",
      discountType: "percentage",
      discountValue: 20,
      usageLimit: 10,
      usedCount: 0,
      status: 1,
    });

    await cartService.addCartItem(userId, {
      variantId: String(variantId),
      qty: 2,
    });
    await applyCouponToCart(userId, "SAVE20");

    const placed = await placeOrder(userId, {
      ...shippingAddress,
      paymentMethod: "cod",
    });

    expect(placed.ok).toBe(true);
    expect(placed.order).toMatchObject({
      amounts: {
        items: 4000,
        discount: 800,
        total: 3200,
      },
      couponCode: "SAVE20",
    });

    const usage = await CouponUsage.findOne({ orderNo: placed.order.orderNo }).lean();
    expect(usage).toMatchObject({
      code: "SAVE20",
      discountAmount: 800,
    });

    const coupon = await Coupon.findOne({ code: "SAVE20" }).lean();
    expect(coupon.usedCount).toBe(1);

    const cart = await Cart.findOne({ userId }).lean();
    expect(cart.items).toHaveLength(0);
    expect(cart.couponCode).toBe("");
  });
});
