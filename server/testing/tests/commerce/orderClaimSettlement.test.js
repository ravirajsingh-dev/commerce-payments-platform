const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Cart = require("../../../models/Cart");
const Order = require("../../../models/Order");
const OrderItem = require("../../../models/OrderItem");
const OrderClaim = require("../../../models/OrderClaim");
const ClaimPolicy = require("../../../models/ClaimPolicy");
const User = require("../../../models/User");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const Shipment = require("../../../models/Shipment");
const TrackingEvent = require("../../../models/TrackingEvent");
const cartService = require("../../../modules/commerce/cart/cartService");
const { placeOrder } = require("../../../modules/commerce/checkout/placeOrderService");
const { createClaimRequest } = require("../../../modules/commerce/order/orderClaimService");
const {
  approveClaimForOrder,
  completeClaimForOrder,
  ORDER_CLAIM_ADMIN_ERROR,
} = require("../../../modules/commerce/order/orderClaimAdminService");

describe("order claim settlement (Phase 04)", () => {
  let mongoServer;
  let userId;
  let adminId;
  let restockableVariantId;
  let bespokeVariantId;

  const shippingAddress = {
    fullName: "Claim Settlement User",
    phone: "9876543210",
    addressLine1: "12 MG Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    country: "IN",
  };

  const seedDeliveredApprovedClaim = async ({ variantId, reasonCode = "size_or_fit_issue" }) => {
    await cartService.addCartItem(userId, { variantId: String(variantId), qty: 1 });
    const placed = await placeOrder(userId, { ...shippingAddress, paymentMethod: "cod" });
    expect(placed.ok).toBe(true);

    const order = await Order.findOne({ orderNo: placed.order.orderNo });
    order.status = "delivered";
    await order.save();

    const shipment = await Shipment.create({
      orderId: order._id,
      orderNo: order.orderNo,
      carrierId: new mongoose.Types.ObjectId(),
      carrierName: "Manual Carrier",
      trackingNumber: `MAN-${order.orderNo}`,
      currentStatus: "delivered",
      latestStepMessage: "Delivered",
      latestStepAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    await TrackingEvent.create({
      shipmentId: shipment._id,
      orderId: order._id,
      status: "delivered",
      message: "Delivered",
      eventAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      location: "Jaipur",
    });

    const claimResult = await createClaimRequest(userId, order.orderNo, {
      type: "exchange",
      reasonCode,
      evidence: {},
    });
    expect(claimResult.ok).toBe(true);

    const approved = await approveClaimForOrder(
      order.orderNo,
      { decisionNote: "Approved for settlement." },
      { actorId: adminId },
    );
    expect(approved.ok).toBe(true);

    const orderItem = await OrderItem.findOne({ orderId: order._id }).lean();
    return { order, orderItem };
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-order-claim-settlement-tests",
    });

    const user = await User.create({
      name: "Settlement User",
      phone: "9123456786",
      email: "claim-settlement-user@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = String(user._id);
    adminId = new mongoose.Types.ObjectId().toString();

    const category = await Category.create({
      name: "Sherwanis",
      slug: "sherwanis-claim-settlement-tests",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-claim-settlement-tests",
      status: 1,
    });

    const restockablePolicy = await ClaimPolicy.create({
      code: "CLAIM-SETTLE-R",
      name: "Claim settle restockable",
      isActive: true,
      eligibility: {
        claimsEnabled: true,
        claimWindowDays: 7,
        allowedClaimTypes: ["exchange", "return"],
        allowedClaimReasons: ["size_or_fit_issue", "other"],
      },
      restockPolicy: {
        restockableByDefault: true,
        requireQcForRestock: true,
        bespokeNonRestockableByDefault: false,
      },
    });

    const bespokePolicy = await ClaimPolicy.create({
      code: "CLAIM-SETTLE-B",
      name: "Claim settle bespoke",
      isActive: true,
      eligibility: {
        claimsEnabled: true,
        claimWindowDays: 7,
        allowedClaimTypes: ["exchange", "return"],
        allowedClaimReasons: ["size_or_fit_issue", "other"],
      },
      restockPolicy: {
        restockableByDefault: false,
        requireQcForRestock: true,
        bespokeNonRestockableByDefault: true,
      },
    });

    const productA = await Product.create({
      name: "Restockable Product",
      slug: "restockable-product-claim",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
      claimPolicyId: restockablePolicy._id,
    });
    const productB = await Product.create({
      name: "Bespoke Product",
      slug: "bespoke-product-claim",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
      claimPolicyId: bespokePolicy._id,
    });

    const variantA = await ProductVariant.create({
      productId: productA._id,
      sku: "CLAIM-SET-R",
      attributes: { color: "ivory" },
      price: 2500,
      sizes: [],
    });
    restockableVariantId = variantA._id;

    const variantB = await ProductVariant.create({
      productId: productB._id,
      sku: "CLAIM-SET-B",
      attributes: { color: "gold" },
      price: 3200,
      sizes: [],
    });
    bespokeVariantId = variantB._id;

    await Inventory.create({ productVariantId: restockableVariantId, stock: 10 });
    await Inventory.create({ productVariantId: bespokeVariantId, stock: 10 });
  });

  afterEach(async () => {
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await OrderItem.deleteMany({});
    await Shipment.deleteMany({});
    await TrackingEvent.deleteMany({});
    await OrderClaim.deleteMany({});
    await Inventory.findOneAndUpdate(
      { productVariantId: restockableVariantId },
      { $set: { stock: 10 } },
    );
    await Inventory.findOneAndUpdate(
      { productVariantId: bespokeVariantId },
      { $set: { stock: 10 } },
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("completes claim with optional restock and payment status update", async () => {
    const { order, orderItem } = await seedDeliveredApprovedClaim({
      variantId: restockableVariantId,
    });

    const inventoryBefore = await Inventory.findOne({ productVariantId: restockableVariantId }).lean();
    expect(inventoryBefore.stock).toBe(9);

    const completed = await completeClaimForOrder(
      order.orderNo,
      {
        resolutionCode: "approved_exchange",
        resolutionNote: "QC passed and settled.",
        restockLines: [
          {
            orderItemId: String(orderItem._id),
            quantity: 1,
            adminConfirmQc: true,
          },
        ],
        paymentStatus: "partially_refunded",
        refundAmount: 500,
      },
      { actorId: adminId },
    );
    expect(completed.ok).toBe(true);
    expect(completed.claim.status).toBe("completed");
    expect(completed.claim.refundAmount).toBe(500);

    const inventoryAfter = await Inventory.findOne({ productVariantId: restockableVariantId }).lean();
    expect(inventoryAfter.stock).toBe(10);
    const persistedOrder = await Order.findOne({ orderNo: order.orderNo }).lean();
    expect(persistedOrder.paymentStatus).toBe("partially_refunded");
  });

  it("blocks bespoke restock unless explicitly confirmed", async () => {
    const { order, orderItem } = await seedDeliveredApprovedClaim({
      variantId: bespokeVariantId,
    });

    const blocked = await completeClaimForOrder(
      order.orderNo,
      {
        resolutionCode: "approved_exchange",
        restockLines: [
          {
            orderItemId: String(orderItem._id),
            quantity: 1,
            adminConfirmQc: true,
          },
        ],
      },
      { actorId: adminId },
    );
    expect(blocked.ok).toBe(false);
    expect(blocked.code).toBe(ORDER_CLAIM_ADMIN_ERROR.RESTOCK_CONFIRMATION_REQUIRED);

    const allowed = await completeClaimForOrder(
      order.orderNo,
      {
        resolutionCode: "approved_exchange",
        restockLines: [
          {
            orderItemId: String(orderItem._id),
            quantity: 1,
            adminConfirmRestock: true,
            adminConfirmQc: true,
          },
        ],
      },
      { actorId: adminId },
    );
    expect(allowed.ok).toBe(true);
  });

  it("blocks restock when QC confirmation is required", async () => {
    const { order, orderItem } = await seedDeliveredApprovedClaim({
      variantId: restockableVariantId,
    });

    const blocked = await completeClaimForOrder(
      order.orderNo,
      {
        resolutionCode: "approved_exchange",
        restockLines: [{ orderItemId: String(orderItem._id), quantity: 1 }],
      },
      { actorId: adminId },
    );
    expect(blocked.ok).toBe(false);
    expect(blocked.code).toBe(ORDER_CLAIM_ADMIN_ERROR.QC_CONFIRMATION_REQUIRED);

    const allowed = await completeClaimForOrder(
      order.orderNo,
      {
        resolutionCode: "approved_exchange",
        adminConfirmQc: true,
        restockLines: [{ orderItemId: String(orderItem._id), quantity: 1 }],
      },
      { actorId: adminId },
    );
    expect(allowed.ok).toBe(true);
  });

  it("does not auto-refund COD when paymentStatus is omitted", async () => {
    const { order } = await seedDeliveredApprovedClaim({
      variantId: restockableVariantId,
    });

    const completed = await completeClaimForOrder(
      order.orderNo,
      {
        resolutionCode: "approved_exchange",
        resolutionNote: "Closed without payment change.",
      },
      { actorId: adminId },
    );
    expect(completed.ok).toBe(true);

    const persistedOrder = await Order.findOne({ orderNo: order.orderNo }).lean();
    expect(persistedOrder.paymentStatus).toBe("cod_pending");
  });

  it("is idempotent: completed claim cannot complete again", async () => {
    const { order } = await seedDeliveredApprovedClaim({
      variantId: restockableVariantId,
    });

    const first = await completeClaimForOrder(
      order.orderNo,
      { resolutionCode: "approved_exchange" },
      { actorId: adminId },
    );
    expect(first.ok).toBe(true);

    const second = await completeClaimForOrder(
      order.orderNo,
      { resolutionCode: "approved_exchange" },
      { actorId: adminId },
    );
    expect(second.ok).toBe(false);
    expect(second.code).toBe(ORDER_CLAIM_ADMIN_ERROR.ALREADY_COMPLETED);
  });
});
