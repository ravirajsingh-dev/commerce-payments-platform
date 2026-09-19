const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Cart = require("../../../models/Cart");
const Order = require("../../../models/Order");
const OrderItem = require("../../../models/OrderItem");
const User = require("../../../models/User");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const cartService = require("../../../modules/commerce/cart/cartService");
const { placeOrder } = require("../../../modules/commerce/checkout/placeOrderService");
const {
  requestOrderCancellation,
  cancelOrderAsAdmin,
  ORDER_CANCEL_ERROR,
} = require("../../../modules/commerce/order/orderCancelService");
const { updateAdminOrder } = require("../../../modules/commerce/order/orderAdminService");

describe("order cancellation (Phases 40–42)", () => {
  let mongoServer;
  let userId;
  let legacyVariantId;
  let adminId;

  const shippingAddress = {
    fullName: "Cancel Test User",
    phone: "9876543210",
    addressLine1: "12 MG Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    country: "IN",
  };

  const placeTestOrder = async () => {
    await cartService.addCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 2,
    });
    const result = await placeOrder(userId, {
      ...shippingAddress,
      paymentMethod: "cod",
    });
    expect(result.ok).toBe(true);
    return result.order;
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-order-cancel-tests",
    });

    const user = await User.create({
      name: "Cancel User",
      phone: "9123456782",
      email: "cancel-user@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = String(user._id);
    adminId = new mongoose.Types.ObjectId().toString();

    const category = await Category.create({
      name: "Sherwanis",
      slug: "sherwanis-cancel",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-cancel",
      status: 1,
    });
    const product = await Product.create({
      name: "Royal Sherwani",
      slug: "royal-sherwani-cancel",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });

    const legacyVariant = await ProductVariant.create({
      productId: product._id,
      sku: "CANCEL-LEGACY-01",
      attributes: { color: "gold" },
      price: 2500,
      sizes: [],
    });
    legacyVariantId = legacyVariant._id;
    await Inventory.create({
      productVariantId: legacyVariantId,
      stock: 20,
    });
  });

  afterEach(async () => {
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await OrderItem.deleteMany({});
    await Inventory.findOneAndUpdate(
      { productVariantId: legacyVariantId },
      { $set: { stock: 20 } },
    );
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("sets cancellationRequestedAt without changing order status (Phase 40)", async () => {
    const placed = await placeTestOrder();

    const result = await requestOrderCancellation(userId, placed.orderNo, {
      reason: "ordered_by_mistake",
      note: "Please cancel this order.",
    });
    expect(result.ok).toBe(true);
    expect(result.order.cancellation.requestedAt).toBeTruthy();
    expect(result.order.cancellation.reason).toBe("ordered_by_mistake");
    expect(result.order.cancellation.note).toBe("Please cancel this order.");
    expect(result.order.status).toBe("order_placed");

    const persisted = await Order.findOne({ orderNo: placed.orderNo }).lean();
    expect(persisted.cancellation.requestedAt).toBeTruthy();
    expect(persisted.status).toBe("order_placed");
  });

  it("rejects duplicate cancellation requests", async () => {
    const placed = await placeTestOrder();
    await requestOrderCancellation(userId, placed.orderNo, {
      reason: "changed_mind",
      note: "",
    });

    const again = await requestOrderCancellation(userId, placed.orderNo, {
      reason: "changed_mind",
    });
    expect(again.ok).toBe(false);
    expect(again.code).toBe(ORDER_CANCEL_ERROR.ALREADY_REQUESTED);
  });

  it("requires a note when reason is other", async () => {
    const placed = await placeTestOrder();

    const result = await requestOrderCancellation(userId, placed.orderNo, {
      reason: "other",
      note: "",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ORDER_CANCEL_ERROR.NOTE_REQUIRED);
  });

  it("rejects cancellation request after order ships", async () => {
    const placed = await placeTestOrder();
    await updateAdminOrder(placed.orderNo, { status: "shipped" }, { actorId: adminId });

    const result = await requestOrderCancellation(userId, placed.orderNo, {
      reason: "changed_mind",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ORDER_CANCEL_ERROR.NOT_ELIGIBLE);
  });

  it("cancels order, releases stock, and records status event (Phase 42)", async () => {
    const placed = await placeTestOrder();
    await requestOrderCancellation(userId, placed.orderNo, {
      reason: "wrong_size_or_item",
      note: "Ordered wrong size",
    });

    const inventoryBefore = await Inventory.findOne({
      productVariantId: legacyVariantId,
    }).lean();
    expect(inventoryBefore.stock).toBe(18);

    const result = await cancelOrderAsAdmin(
      placed.orderNo,
      { reason: "wrong_address", note: "Pincode not serviceable" },
      { actorId: adminId },
    );
    expect(result.ok).toBe(true);
    expect(result.order.status).toBe("cancelled");
    expect(result.order.paymentStatus).toBe("cancelled");
    expect(result.order.cancellation.requestedAt).toBeNull();
    expect(result.order.cancellation.reason).toBe("wrong_address");
    expect(result.order.cancellation.note).toBe("Pincode not serviceable");

    const inventoryAfter = await Inventory.findOne({
      productVariantId: legacyVariantId,
    }).lean();
    expect(inventoryAfter.stock).toBe(20);

    const persisted = await Order.findOne({ orderNo: placed.orderNo }).lean();
    expect(persisted.status).toBe("cancelled");
    expect(persisted.paymentStatus).toBe("cancelled");
  });

  it("requires reason and note when admin cancels with other", async () => {
    const placed = await placeTestOrder();

    const missingReason = await cancelOrderAsAdmin(placed.orderNo, {}, { actorId: adminId });
    expect(missingReason.ok).toBe(false);

    const missingNote = await cancelOrderAsAdmin(
      placed.orderNo,
      { reason: "other", note: "" },
      { actorId: adminId },
    );
    expect(missingNote.ok).toBe(false);
    expect(missingNote.code).toBe(ORDER_CANCEL_ERROR.NOTE_REQUIRED);
  });

  it("rejects customer-only cancellation reasons on admin cancel", async () => {
    const placed = await placeTestOrder();

    const result = await cancelOrderAsAdmin(
      placed.orderNo,
      { reason: "changed_mind", note: "" },
      { actorId: adminId },
    );
    expect(result.ok).toBe(false);
    expect(result.code).toBe(ORDER_CANCEL_ERROR.INVALID_REASON);
  });
});
