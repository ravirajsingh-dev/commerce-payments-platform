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
const { createClaimRequest, submitClaimReturnShipment, ORDER_CLAIM_ERROR } = require("../../../modules/commerce/order/orderClaimService");
const { approveClaimForOrder, rejectClaimForOrder } = require("../../../modules/commerce/order/orderClaimAdminService");
const { listUserOrders, getUserOrderByOrderNo } = require("../../../modules/commerce/order/orderService");

describe("order claim request (Phase 02)", () => {
  let mongoServer;
  let userId;
  let variantAId;
  let variantBId;
  let policyId;

  const shippingAddress = {
    fullName: "Claim Test User",
    phone: "9876543210",
    addressLine1: "12 MG Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    country: "IN",
  };
  const recentDeliveredAt = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

  const seedDeliveredOrder = async ({ deliveredAt, createdAt } = {}) => {
    await cartService.addCartItem(userId, { variantId: String(variantAId), qty: 1 });
    await cartService.addCartItem(userId, { variantId: String(variantBId), qty: 1 });
    const placed = await placeOrder(userId, { ...shippingAddress, paymentMethod: "cod" });
    expect(placed.ok).toBe(true);

    const order = await Order.findOne({ orderNo: placed.order.orderNo });
    order.status = "delivered";
    if (createdAt) {
      order.createdAt = createdAt;
    }
    await order.save();

    const orderItems = await OrderItem.find({ orderId: order._id }).sort({ createdAt: 1 }).lean();

    await Shipment.create({
      orderId: order._id,
      orderNo: order.orderNo,
      carrierId: new mongoose.Types.ObjectId(),
      carrierName: "Manual Carrier",
      trackingNumber: `MAN-${order.orderNo}`,
      currentStatus: "delivered",
      latestStepMessage: "Delivered",
      latestStepAt: deliveredAt,
    });
    await TrackingEvent.create({
      shipmentId: (await Shipment.findOne({ orderId: order._id }).lean())._id,
      orderId: order._id,
      status: "delivered",
      message: "Delivered",
      eventAt: deliveredAt,
      location: "Jaipur",
    });

    return { order: order.toObject(), items: orderItems };
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-order-claim-request-tests",
    });

    const user = await User.create({
      name: "Claim User",
      phone: "9123456788",
      email: "claim-user@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = String(user._id);

    const category = await Category.create({
      name: "Sherwanis",
      slug: "sherwanis-claim-tests",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-claim-tests",
      status: 1,
    });

    const policy = await ClaimPolicy.create({
      code: "CLAIM-7D",
      name: "Claim policy 7 days",
      isActive: true,
      eligibility: {
        claimsEnabled: true,
        claimWindowDays: 7,
        allowedClaimTypes: ["return", "exchange"],
        allowedClaimReasons: ["damaged_or_defective", "size_or_fit_issue", "other"],
      },
      evidenceRules: {
        minImages: 0,
        maxImages: 5,
        requiredByTypeReason: [
          {
            claimType: "return",
            reasonCode: "damaged_or_defective",
            requiredEvidence: ["damageProof"],
          },
        ],
        requireCourierReceipt: false,
      },
    });
    policyId = policy._id;

    const product = await Product.create({
      name: "Royal Sherwani Claim",
      slug: "royal-sherwani-claim",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
      claimPolicyId: policyId,
    });

    const variantA = await ProductVariant.create({
      productId: product._id,
      sku: "CLAIM-001-A",
      attributes: { color: "ivory" },
      price: 2500,
      sizes: [],
    });
    variantAId = variantA._id;

    const variantB = await ProductVariant.create({
      productId: product._id,
      sku: "CLAIM-001-B",
      attributes: { color: "gold" },
      price: 3000,
      sizes: [],
    });
    variantBId = variantB._id;

    await Inventory.create({ productVariantId: variantAId, stock: 20 });
    await Inventory.create({ productVariantId: variantBId, stock: 20 });
  });

  afterEach(async () => {
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await OrderItem.deleteMany({});
    await Shipment.deleteMany({});
    await TrackingEvent.deleteMany({});
    await OrderClaim.deleteMany({});
    await Inventory.findOneAndUpdate({ productVariantId: variantAId }, { $set: { stock: 20 } });
    await Inventory.findOneAndUpdate({ productVariantId: variantBId }, { $set: { stock: 20 } });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("blocks claim request before order is delivered", async () => {
    await cartService.addCartItem(userId, { variantId: String(variantAId), qty: 1 });
    const placed = await placeOrder(userId, { ...shippingAddress, paymentMethod: "cod" });
    expect(placed.ok).toBe(true);

    const result = await createClaimRequest(userId, placed.order.orderNo, {
      type: "return",
      reasonCode: "size_or_fit_issue",
      note: "Not fitting",
      evidence: {},
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe(ORDER_CLAIM_ERROR.ORDER_NOT_DELIVERED);
  });

  it("blocks duplicate open claim for same scope", async () => {
    const { order, items } = await seedDeliveredOrder({
      deliveredAt: recentDeliveredAt(),
    });

    const first = await createClaimRequest(userId, order.orderNo, {
      type: "exchange",
      reasonCode: "size_or_fit_issue",
      affectedLines: [{ orderItemId: String(items[0]._id), quantity: 1 }],
      evidence: {},
    });
    expect(first.ok).toBe(true);

    const duplicate = await createClaimRequest(userId, order.orderNo, {
      type: "exchange",
      reasonCode: "size_or_fit_issue",
      affectedLines: [{ orderItemId: String(items[0]._id), quantity: 1 }],
      evidence: {},
    });
    expect(duplicate.ok).toBe(false);
    expect(duplicate.code).toBe(ORDER_CLAIM_ERROR.DUPLICATE_SCOPE_OPEN_CLAIM);
  });

  it("allows unrelated scope claim while another scope is open", async () => {
    const { order, items } = await seedDeliveredOrder({
      deliveredAt: recentDeliveredAt(),
    });

    const lineOne = await createClaimRequest(userId, order.orderNo, {
      type: "exchange",
      reasonCode: "size_or_fit_issue",
      affectedLines: [{ orderItemId: String(items[0]._id), quantity: 1 }],
      evidence: {},
    });
    expect(lineOne.ok).toBe(true);

    const lineTwo = await createClaimRequest(userId, order.orderNo, {
      type: "exchange",
      reasonCode: "size_or_fit_issue",
      affectedLines: [{ orderItemId: String(items[1]._id), quantity: 1 }],
      evidence: {},
    });
    expect(lineTwo.ok).toBe(true);
  });

  it("uses delivered milestone time for claim window (not order createdAt)", async () => {
    const { order } = await seedDeliveredOrder({
      createdAt: new Date("2026-04-01T10:00:00.000Z"),
      deliveredAt: new Date(),
    });

    const result = await createClaimRequest(userId, order.orderNo, {
      type: "exchange",
      reasonCode: "size_or_fit_issue",
      evidence: {},
    });
    expect(result.ok).toBe(true);
  });

  it("enforces photo count at claim request and defers proof to return shipment", async () => {
    const { order } = await seedDeliveredOrder({
      deliveredAt: recentDeliveredAt(),
    });

    await OrderItem.updateMany(
      { orderId: order._id },
      {
        $set: {
          "claimPolicySnapshot.evidenceRules.minImages": 1,
          "claimPolicySnapshot.evidenceRules.requireDamageProof": true,
          "claimPolicySnapshot.evidenceRules.requireFitProof": true,
          "claimPolicySnapshot.evidenceRules.requireCourierReceipt": true,
        },
      },
    );

    const missingPhotos = await createClaimRequest(userId, order.orderNo, {
      type: "return",
      reasonCode: "damaged_or_defective",
      evidence: {},
    });
    expect(missingPhotos.ok).toBe(false);
    expect(missingPhotos.code).toBe(ORDER_CLAIM_ERROR.EVIDENCE_REQUIRED);

    const withPhotosOnly = await createClaimRequest(userId, order.orderNo, {
      type: "return",
      reasonCode: "damaged_or_defective",
      evidence: {
        images: [{ url: "https://cdn.test/img1.jpg", key: "img1" }],
      },
    });
    expect(withPhotosOnly.ok).toBe(true);
  });

  it("accepts courier receipt only after approval via return shipment submit", async () => {
    const { order } = await seedDeliveredOrder({
      deliveredAt: recentDeliveredAt(),
    });

    const created = await createClaimRequest(userId, order.orderNo, {
      type: "return",
      reasonCode: "damaged_or_defective",
      evidence: {
        images: [{ url: "https://cdn.test/img1.jpg", key: "img1" }],
      },
    });
    expect(created.ok).toBe(true);

    const approved = await approveClaimForOrder(order.orderNo, { decisionNote: "Approved" });
    expect(approved.ok).toBe(true);

    const missingReceipt = await submitClaimReturnShipment(userId, order.orderNo, {
      customerLogistics: { trackingNumber: "TRK-123" },
      evidence: {},
    });
    expect(missingReceipt.ok).toBe(false);
    expect(missingReceipt.code).toBe(ORDER_CLAIM_ERROR.EVIDENCE_REQUIRED);

    const submitted = await submitClaimReturnShipment(userId, order.orderNo, {
      customerLogistics: {
        courierName: "DTDC",
        trackingNumber: "TRK-123",
      },
      evidence: {
        courierReceipt: [{ url: "https://cdn.test/receipt.pdf", key: "receipt1" }],
      },
    });
    expect(submitted.ok).toBe(true);
    expect(submitted.claim.status).toBe("in_transit");
    expect(submitted.claim.needsReturnShipment).toBe(false);
    expect(submitted.claim.trackingNumber).toBe("TRK-123");
  });

  it("includes claim summary in user order list and detail payload", async () => {
    const { order } = await seedDeliveredOrder({
      deliveredAt: recentDeliveredAt(),
    });

    const claimResult = await createClaimRequest(userId, order.orderNo, {
      type: "exchange",
      reasonCode: "size_or_fit_issue",
      note: "Need one size up",
      evidence: {},
    });
    expect(claimResult.ok).toBe(true);

    const list = await listUserOrders(userId, { page: 1, limit: 10 });
    expect(list.ok).toBe(true);
    expect(list.orders[0].claim).toMatchObject({
      status: "pending",
      type: "exchange",
      reasonCode: "size_or_fit_issue",
    });

    const detail = await getUserOrderByOrderNo(userId, order.orderNo);
    expect(detail.ok).toBe(true);
    expect(detail.order.claim).toMatchObject({
      status: "pending",
      type: "exchange",
    });
  });

  it("uses order item claimPolicySnapshot even after active policy is edited", async () => {
    const { order } = await seedDeliveredOrder({
      deliveredAt: new Date(),
    });

    await ClaimPolicy.findByIdAndUpdate(policyId, {
      $set: {
        "eligibility.claimsEnabled": false,
        "eligibility.allowedClaimTypes": [],
      },
    });

    const result = await createClaimRequest(userId, order.orderNo, {
      type: "exchange",
      reasonCode: "size_or_fit_issue",
      evidence: {},
    });

    expect(result.ok).toBe(true);
  });

  it("exposes claim policy evidenceRules on user order detail items", async () => {
    const { order } = await seedDeliveredOrder({
      deliveredAt: recentDeliveredAt(),
    });

    const detail = await getUserOrderByOrderNo(userId, order.orderNo);
    expect(detail.ok).toBe(true);
    expect(detail.order.items.length).toBeGreaterThan(0);
    expect(detail.order.items[0].orderItemId).toBeTruthy();
    expect(detail.order.items[0].claimPolicySnapshot?.evidenceRules).toMatchObject({
      minImages: 0,
      maxImages: 5,
      requireCourierReceipt: false,
    });
    expect(
      detail.order.items[0].claimPolicySnapshot?.evidenceRules?.requiredByTypeReason,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          claimType: "return",
          reasonCode: "damaged_or_defective",
          requiredEvidence: ["damageProof"],
        }),
      ]),
    );
  });

  it("exposes expanded claim summary and eligibility on order detail (Phase 2)", async () => {
    const { order, items } = await seedDeliveredOrder({
      deliveredAt: recentDeliveredAt(),
    });

    const created = await createClaimRequest(userId, order.orderNo, {
      type: "exchange",
      reasonCode: "size_or_fit_issue",
      note: "Need one size up",
      affectedLines: [{ orderItemId: String(items[0]._id), quantity: 1, note: "Too tight" }],
      evidence: {},
    });
    expect(created.ok).toBe(true);

    const rejected = await rejectClaimForOrder(order.orderNo, {
      decisionNote: "Outside return policy window for this item",
    });
    expect(rejected.ok).toBe(true);

    const detail = await getUserOrderByOrderNo(userId, order.orderNo);
    expect(detail.ok).toBe(true);
    expect(detail.order.claim).toMatchObject({
      status: "rejected",
      rejectionReason: "Outside return policy window for this item",
      customerNote: "Need one size up",
      affectedLines: [
        expect.objectContaining({
          orderItemId: String(items[0]._id),
          quantity: 1,
          note: "Too tight",
        }),
      ],
    });
    expect(detail.order.claimEligibility).toMatchObject({
      canRequestClaim: true,
      canResubmit: true,
      policyEligible: true,
    });
    expect(detail.order.claimEligibility.claimWindowDeadline).toBeTruthy();
  });

  it("allows re-submit after rejection for the same scope (Phase 2 C8)", async () => {
    const { order } = await seedDeliveredOrder({
      deliveredAt: recentDeliveredAt(),
    });

    const first = await createClaimRequest(userId, order.orderNo, {
      type: "exchange",
      reasonCode: "size_or_fit_issue",
      evidence: {},
    });
    expect(first.ok).toBe(true);

    const rejected = await rejectClaimForOrder(order.orderNo, {
      decisionNote: "Insufficient evidence",
    });
    expect(rejected.ok).toBe(true);

    const resubmit = await createClaimRequest(userId, order.orderNo, {
      type: "return",
      reasonCode: "damaged_or_defective",
      note: "Resubmitting with clearer details",
      evidence: {},
    });
    expect(resubmit.ok).toBe(true);
    expect(resubmit.claim.status).toBe("pending");
    expect(resubmit.claim.type).toBe("return");

    const detail = await getUserOrderByOrderNo(userId, order.orderNo);
    expect(detail.order.claim.status).toBe("pending");
    expect(detail.order.claim.type).toBe("return");
  });
});
