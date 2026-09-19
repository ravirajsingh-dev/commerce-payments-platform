jest.setTimeout(30000);

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Order = require("../../../models/Order");
const { testOrderAmounts } = require("../../helpers/orderAmounts");
const OrderItem = require("../../../models/OrderItem");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const User = require("../../../models/User");
const { buildVariantSalesMap } = require("../../../modules/commerce/analytics/variantSalesService");
const { getProductBySlug } = require("../../../modules/store/storeService");

const addressSnapshot = {
  fullName: "Test User",
  phone: "9999999999",
  addressLine1: "1 Test Street",
  addressLine2: "",
  city: "Mumbai",
  state: "MH",
  pincode: "400001",
  country: "IN",
};

describe("best-selling sort from orders (Phase 10)", () => {
  let mongoServer;
  let userId;
  let productSlug;
  let variantHighSales;
  let variantLowSales;
  let variantHighStock;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-best-selling-sort-tests",
    });

    const user = await User.create({
      name: "Best Seller User",
      phone: "9876543301",
      email: "best-seller@example.com",
      password: "password123",
    });
    userId = user._id;

    const category = await Category.create({
      name: "Kurtas",
      slug: "kurtas-best-seller",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-best-seller",
      status: 1,
    });
    const product = await Product.create({
      name: "Best Seller Collection",
      slug: "best-seller-collection",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });
    productSlug = product.slug;

    const high = await ProductVariant.create({
      productId: product._id,
      sku: "BS-HIGH",
      name: "High Revenue Variant",
      attributes: { color: "gold" },
      price: 5000,
      sizes: [{ value: "m", label: "M", stock: 1 }],
      status: 1,
    });
    const low = await ProductVariant.create({
      productId: product._id,
      sku: "BS-LOW",
      name: "Low Revenue Variant",
      attributes: { color: "silver" },
      price: 1000,
      sizes: [{ value: "m", label: "M", stock: 1 }],
      status: 1,
    });
    const stocked = await ProductVariant.create({
      productId: product._id,
      sku: "BS-STOCK",
      name: "High Stock No Sales",
      attributes: { color: "white" },
      price: 800,
      sizes: [{ value: "m", label: "M", stock: 99 }],
      status: 1,
    });

    variantHighSales = high._id;
    variantLowSales = low._id;
    variantHighStock = stocked._id;

    const order = await Order.create({
      orderNo: "RW260519BBBB01",
      userId,
      status: "delivered",
      paymentStatus: "paid",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 6000, total: 6000 }),
      addressSnapshot,
    });

    await OrderItem.insertMany([
      {
        orderId: order._id,
        productId: product._id,
        productVariantId: variantHighSales,
        productNameSnapshot: product.name,
        productSlugSnapshot: product.slug,
        skuSnapshot: "BS-HIGH",
        quantity: 1,
        unitPriceSnapshot: 5000,
        lineTotal: 5000,
      },
      {
        orderId: order._id,
        productId: product._id,
        productVariantId: variantLowSales,
        productNameSnapshot: product.name,
        productSlugSnapshot: product.slug,
        skuSnapshot: "BS-LOW",
        quantity: 1,
        unitPriceSnapshot: 1000,
        lineTotal: 1000,
      },
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("builds variant sales totals from non-cancelled orders", async () => {
    const map = await buildVariantSalesMap();
    expect(map.get(String(variantHighSales))).toMatchObject({
      unitsSold: 1,
      revenue: 5000,
    });
    expect(map.get(String(variantLowSales))).toMatchObject({
      unitsSold: 1,
      revenue: 1000,
    });
    expect(map.has(String(variantHighStock))).toBe(false);
  });

  it("sorts collection variants by revenue, not inventory stock", async () => {
    const result = await getProductBySlug(productSlug, { sort: "best-selling" });
    expect(result).toBeTruthy();
    expect(result.sort).toBe("best-selling");

    const ids = result.variants.map((row) => String(row._id));
    expect(ids[0]).toBe(String(variantHighSales));
    expect(ids[1]).toBe(String(variantLowSales));
    expect(ids[ids.length - 1]).toBe(String(variantHighStock));

    const top = result.variants[0];
    expect(top.unitsSold).toBe(1);
    expect(top.salesRevenue).toBe(5000);

    const noSales = result.variants.find(
      (row) => String(row._id) === String(variantHighStock),
    );
    expect(noSales.unitsSold).toBe(0);
    expect(noSales.salesRevenue).toBe(0);
    expect(noSales.stock).toBe(99);
  });
});
