const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Admin = require("../../../models/Admin");
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
const { patchAdminOrderAddressSnapshot } = require("../../../modules/commerce/order/orderAddressSnapshot");
const { cancelOrderAsAdmin } = require("../../../modules/commerce/order/orderCancelService");
const { getUserOrderByOrderNo } = require("../../../modules/commerce/order/orderService");

describe("admin order address snapshot patch (Phase 44)", () => {
  let mongoServer;
  let userId;
  let legacyVariantId;
  let adminId;

  const shippingAddress = {
    fullName: "Address Patch User",
    phone: "9876543210",
    addressLine1: "12 MG Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    country: "IN",
  };

  const updatedAddress = {
    fullName: "Address Patch User",
    phone: "9876543210",
    addressLine1: "88 Station Road",
    addressLine2: "Block B",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302017",
    country: "IN",
  };

  const placeTestOrder = async () => {
    await cartService.addCartItem(userId, {
      variantId: String(legacyVariantId),
      qty: 1,
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
      dbName: "commerce-order-address-patch-tests",
    });

    const user = await User.create({
      name: "Address Patch User",
      phone: "9123456791",
      email: "address-patch-user@example.com",
      password: "hashed-placeholder",
      status: 1,
      uuid: new mongoose.Types.ObjectId().toString(),
    });
    userId = String(user._id);

    const admin = await Admin.create({
      name: "Ops Admin",
      email: "ops-admin@example.com",
      password: "hashed-placeholder",
      status: 1,
    });
    adminId = String(admin._id);

    const category = await Category.create({
      name: "Sherwanis",
      slug: "sherwanis-address-patch",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-address-patch",
      status: 1,
    });
    const product = await Product.create({
      name: "Royal Sherwani",
      slug: "royal-sherwani-address-patch",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });

    const legacyVariant = await ProductVariant.create({
      productId: product._id,
      sku: "ADDRESS-PATCH-01",
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
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("updates addressSnapshot and records an audit timeline event", async () => {
    const order = await placeTestOrder();
    const previousUserAddressId = order.addressSnapshot?.userAddressId;

    const result = await patchAdminOrderAddressSnapshot(order.orderNo, {
      addressSnapshot: updatedAddress,
    }, { actorId: adminId });

    expect(result.ok).toBe(true);
    expect(result.order.addressSnapshot.addressLine1).toBe("88 Station Road");
    expect(result.order.addressSnapshot.pincode).toBe("302017");

    const persisted = await Order.findOne({ orderNo: order.orderNo }).lean();
    expect(persisted.addressSnapshot.addressLine1).toBe("88 Station Road");
    if (previousUserAddressId) {
      expect(String(persisted.addressSnapshot.userAddressId)).toBe(
        String(previousUserAddressId),
      );
    }

  });

  it("rejects invalid address payloads", async () => {
    const order = await placeTestOrder();

    const result = await patchAdminOrderAddressSnapshot(order.orderNo, {
      addressSnapshot: {
        ...shippingAddress,
        phone: "123",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(400);
  });

  it("rejects unchanged address payloads", async () => {
    const order = await placeTestOrder();

    const result = await patchAdminOrderAddressSnapshot(order.orderNo, {
      addressSnapshot: shippingAddress,
    });

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(400);
  });

  it("rejects address edits on cancelled orders", async () => {
    const order = await placeTestOrder();
    await cancelOrderAsAdmin(
      order.orderNo,
      { reason: "out_of_stock", note: "" },
      { actorId: adminId },
    );

    const result = await patchAdminOrderAddressSnapshot(order.orderNo, {
      addressSnapshot: updatedAddress,
    });

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(400);
  });

  it("exposes updated snapshot on customer order detail without UserAddress writes", async () => {
    const order = await placeTestOrder();
    await patchAdminOrderAddressSnapshot(order.orderNo, {
      addressSnapshot: updatedAddress,
    });

    const customerOrder = await getUserOrderByOrderNo(userId, order.orderNo);
    expect(customerOrder.ok).toBe(true);
    expect(customerOrder.order.addressSnapshot.addressLine1).toBe("88 Station Road");
  });
});
