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
  listClaimsForAdmin,
  getClaimByOrderNoForAdmin,
  approveClaimForOrder,
  rejectClaimForOrder,
  patchClaimForOrder,
  ORDER_CLAIM_ADMIN_ERROR,
} = require("../../../modules/commerce/order/orderClaimAdminService");
const { listAdminOrders } = require("../../../modules/commerce/order/orderAdminService");

describe("order claim admin flow (Phase 03)", () => {
  let mongoServer;
  let userId;
  let adminId;
  let variantAId;
  let policyId;

  const shippingAddress = {
    fullName: "Claim Admin User",
    phone: "9876543210",
    addressLine1: "12 MG Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    country: "IN",
  };

  const seedDeliveredOrderWithClaim = async (type = "exchange") => {
    await cartService.addCartItem(userId, { variantId: String(variantAId), qty: 1 });
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

    const claim = await createClaimRequest(userId, order.orderNo, {
      type,
      reasonCode: "size_or_fit_issue",
      evidence: {},
    });
    expect(claim.ok).toBe(true);

    return order.orderNo;
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-order-claim-admin-flow-tests",
    });

    const user = await User.create({
      name: "Claim Admin Customer",
      phone: "9123456787",
      email: "claim-admin-user@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = String(user._id);
    adminId = new mongoose.Types.ObjectId().toString();

    const category = await Category.create({
      name: "Sherwanis",
      slug: "sherwanis-claim-admin-tests",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-claim-admin-tests",
      status: 1,
    });
    const policy = await ClaimPolicy.create({
      code: "CLAIM-ADM-7D",
      name: "Claim policy admin",
      isActive: true,
      eligibility: {
        claimsEnabled: true,
        claimWindowDays: 7,
        allowedClaimTypes: ["return", "exchange"],
        allowedClaimReasons: ["size_or_fit_issue", "other"],
      },
    });
    policyId = policy._id;

    const product = await Product.create({
      name: "Royal Sherwani Claim Admin",
      slug: "royal-sherwani-claim-admin",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
      claimPolicyId: policyId,
    });
    const variantA = await ProductVariant.create({
      productId: product._id,
      sku: "CLAIM-ADM-001",
      attributes: { color: "ivory" },
      price: 2500,
      sizes: [],
    });
    variantAId = variantA._id;
    await Inventory.create({ productVariantId: variantAId, stock: 20 });
  });

  afterEach(async () => {
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await OrderItem.deleteMany({});
    await Shipment.deleteMany({});
    await TrackingEvent.deleteMany({});
    await OrderClaim.deleteMany({});
    await Inventory.findOneAndUpdate({ productVariantId: variantAId }, { $set: { stock: 20 } });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("lists pending claims and returns claim by orderNo", async () => {
    const orderNo = await seedDeliveredOrderWithClaim();

    const list = await listClaimsForAdmin({ status: "pending" });
    expect(list.ok).toBe(true);
    expect(list.claims).toHaveLength(1);
    expect(list.claims[0].orderNo).toBe(orderNo);

    const byOrder = await getClaimByOrderNoForAdmin(orderNo);
    expect(byOrder.ok).toBe(true);
    expect(byOrder.claim.status).toBe("pending");
  });

  it("approves pending claim and blocks second decision", async () => {
    const orderNo = await seedDeliveredOrderWithClaim();

    const approved = await approveClaimForOrder(
      orderNo,
      { decisionNote: "Approved after checking evidence." },
      { actorId: adminId },
    );
    expect(approved.ok).toBe(true);
    expect(approved.claim.status).toBe("approved");

    const again = await rejectClaimForOrder(
      orderNo,
      { decisionNote: "Late reject" },
      { actorId: adminId },
    );
    expect(again.ok).toBe(false);
    expect(again.code).toBe(ORDER_CLAIM_ADMIN_ERROR.ALREADY_DECIDED);
  });

  it("rejects pending claim and requires rejection note", async () => {
    const orderNo = await seedDeliveredOrderWithClaim();

    const missingNote = await rejectClaimForOrder(orderNo, { decisionNote: "" }, { actorId: adminId });
    expect(missingNote.ok).toBe(false);

    const rejected = await rejectClaimForOrder(
      orderNo,
      { decisionNote: "Outside policy exception." },
      { actorId: adminId },
    );
    expect(rejected.ok).toBe(true);
    expect(rejected.claim.status).toBe("rejected");
  });

  it("patches operational fields on approved claim", async () => {
    const orderNo = await seedDeliveredOrderWithClaim();
    await approveClaimForOrder(orderNo, { decisionNote: "Approved." }, { actorId: adminId });

    const patched = await patchClaimForOrder(
      orderNo,
      {
        status: "in_transit",
        adminNote: "Customer shared courier details.",
        customerLogistics: {
          mode: "self_courier",
          courierName: "DTDC",
          trackingNumber: "DTDC12345",
        },
      },
      { actorId: adminId },
    );
    expect(patched.ok).toBe(true);
    expect(patched.claim.status).toBe("in_transit");
    expect(patched.claim.courierName).toBe("DTDC");
  });

  it("blocks invalid status patch transitions (Phase 4)", async () => {
    const orderNo = await seedDeliveredOrderWithClaim();

    const invalid = await patchClaimForOrder(
      orderNo,
      { status: "received" },
      { actorId: adminId },
    );
    expect(invalid.ok).toBe(false);
    expect(invalid.code).toBe(ORDER_CLAIM_ADMIN_ERROR.INVALID_TRANSITION);

    await approveClaimForOrder(orderNo, { decisionNote: "Approved." }, { actorId: adminId });
    const received = await patchClaimForOrder(
      orderNo,
      { status: "received" },
      { actorId: adminId },
    );
    expect(received.ok).toBe(true);
    expect(received.claim.status).toBe("received");
  });

  it("reports pendingClaimCount and supports pendingClaim filter in admin orders list", async () => {
    const orderNo = await seedDeliveredOrderWithClaim();

    const list = await listAdminOrders({ page: 1, limit: 10 });
    expect(list.ok).toBe(true);
    expect(list.pendingClaimCount).toBe(1);
    const matchingOrder = list.orders.find((row) => row.orderNo === orderNo);
    expect(matchingOrder.claim).toMatchObject({
      status: "pending",
      type: "exchange",
    });

    const filtered = await listAdminOrders({
      page: 1,
      limit: 10,
      pendingClaim: "true",
    });
    expect(filtered.ok).toBe(true);
    expect(filtered.orders).toHaveLength(1);
    expect(filtered.orders[0].orderNo).toBe(orderNo);
  });
});
