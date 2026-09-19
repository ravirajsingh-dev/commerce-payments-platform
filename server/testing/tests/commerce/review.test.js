const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const Review = require("../../../models/Review");
const Order = require("../../../models/Order");
const { testOrderAmounts } = require("../../helpers/orderAmounts");
const OrderItem = require("../../../models/OrderItem");
const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const User = require("../../../models/User");
const {
  listApprovedReviewsForVariant,
  submitReview,
  getUserReviewContext,
  getOrderReviewContext,
} = require("../../../modules/commerce/review/reviewService");
const {
  setAdminReviewStatus,
  deleteAdminReview,
  bulkDeleteAdminReviews,
} = require("../../../modules/commerce/review/reviewAdminService");

jest.setTimeout(30000);

describe("product reviews (Phases 4–5)", () => {
  let mongoServer;
  let userId;
  let otherUserId;
  let variantId;
  let productId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-review-tests",
    });

    const user = await User.create({
      name: "Review Tester",
      phone: "9876543211",
      email: "review-tester@example.com",
      password: "password123",
    });
    userId = String(user._id);

    const otherUser = await User.create({
      name: "Another Reviewer",
      phone: "9876543212",
      email: "other-reviewer@example.com",
      password: "password123",
    });
    otherUserId = String(otherUser._id);

    const category = await Category.create({
      name: "Sherwanis",
      slug: "sherwanis-review",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-review",
      status: 1,
    });
    const product = await Product.create({
      name: "Review Sherwani",
      slug: "review-sherwani",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });
    productId = product._id;
    const variant = await ProductVariant.create({
      productId: product._id,
      sku: "REV-01",
      attributes: { color: "gold" },
      price: 1500,
      sizes: [],
      status: 1,
    });
    variantId = String(variant._id);

    const order = await Order.create({
      orderNo: "RJ250519REV001",
      userId: user._id,
      status: "delivered",
      paymentStatus: "paid",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 1500, total: 1500 }),
      addressSnapshot: {
        fullName: "Review Tester",
        phone: "9876543211",
        addressLine1: "12 MG Road",
        city: "Jaipur",
        state: "Rajasthan",
        pincode: "302001",
        country: "IN",
      },
    });
    await OrderItem.create({
      orderId: order._id,
      productId: product._id,
      productVariantId: variant._id,
      size: "42",
      attributesSnapshot: { color: "gold" },
      productNameSnapshot: "Review Sherwani",
      productSlugSnapshot: "review-sherwani",
      skuSnapshot: "REV-01",
      quantity: 1,
      unitPriceSnapshot: 1500,
      lineTotal: 1500,
    });
  });

  afterEach(async () => {
    await Review.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("returns only approved reviews on the storefront list", async () => {
    await Review.create({
      productId,
      productVariantId: variantId,
      userId,
      rating: 5,
      title: "Pending",
      comment: "Waiting",
      status: "pending",
    });
    const approved = await Review.create({
      productId,
      productVariantId: variantId,
      userId: otherUserId,
      rating: 4,
      title: "Lovely",
      comment: "Great fit",
      status: "approved",
    });

    const otherOrder = await Order.create({
      orderNo: "RJ250519REV002",
      userId: otherUserId,
      status: "delivered",
      paymentStatus: "paid",
      paymentMethod: "cod",
      amounts: testOrderAmounts({ items: 1500, total: 1500 }),
      addressSnapshot: {
        fullName: "Another Reviewer",
        phone: "9876543212",
        addressLine1: "14 Station Road",
        city: "Jaipur",
        state: "Rajasthan",
        pincode: "302001",
        country: "IN",
      },
    });
    await OrderItem.create({
      orderId: otherOrder._id,
      productId,
      productVariantId: variantId,
      size: "42",
      attributesSnapshot: { color: "gold" },
      productNameSnapshot: "Review Sherwani",
      productSlugSnapshot: "review-sherwani",
      skuSnapshot: "REV-01",
      quantity: 1,
      unitPriceSnapshot: 1500,
      lineTotal: 1500,
    });

    const result = await listApprovedReviewsForVariant(variantId);
    expect(result.ok).toBe(true);
    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0]._id).toBe(String(approved._id));
    expect(result.reviews[0].reviewerName).toBe("Another Reviewer");
    expect(result.reviews[0].purchaseFor).toMatch(/Color/i);
    expect(result.reviews[0].purchaseFor).toMatch(/Size: 42/i);
    expect(result.summary).toMatchObject({
      reviewCount: 1,
      averageRating: 4,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 0 },
    });
  });

  it("submits a review for a purchased variant and blocks duplicates", async () => {
    const submitted = await submitReview(userId, {
      productVariantId: variantId,
      rating: 5,
      title: "Excellent",
      comment: "Would buy again",
    });
    expect(submitted.ok).toBe(true);
    expect(submitted.review.status).toBe("pending");

    const duplicate = await submitReview(userId, {
      productVariantId: variantId,
      rating: 4,
    });
    expect(duplicate.ok).toBe(false);
    expect(duplicate.code).toBe("DUPLICATE_REVIEW");
  });

  it("exposes review context for eligible purchasers", async () => {
    const context = await getUserReviewContext(userId, variantId);
    expect(context.ok).toBe(true);
    expect(context.canReview).toBe(true);
    expect(context.review).toBeNull();
  });

  it("returns per-item review context for delivered orders", async () => {
    const context = await getOrderReviewContext(userId, "RJ250519REV001");
    expect(context.ok).toBe(true);
    expect(context.canReviewOrder).toBe(true);
    expect(context.items).toHaveLength(1);
    expect(context.items[0]).toMatchObject({
      variantId,
      canReview: true,
      productName: "Review Sherwani",
    });
    expect(context.items[0].review).toBeNull();
  });

  it("marks order items as reviewed after submission", async () => {
    await submitReview(userId, {
      productVariantId: variantId,
      rating: 5,
      title: "Great",
      comment: "Loved it",
    });

    const context = await getOrderReviewContext(userId, "RJ250519REV001");
    expect(context.ok).toBe(true);
    expect(context.canReviewOrder).toBe(false);
    expect(context.items[0].canReview).toBe(false);
    expect(context.items[0].review?.rating).toBe(5);
  });

  it("approves a review via admin service", async () => {
    const doc = await Review.create({
      productId,
      productVariantId: variantId,
      userId,
      rating: 3,
      title: "OK",
      comment: "Average",
      status: "pending",
    });

    const result = await setAdminReviewStatus(String(doc._id), "approved");
    expect(result.ok).toBe(true);
    expect(result.review.status).toBe("approved");

    const listed = await listApprovedReviewsForVariant(variantId);
    expect(listed.reviews.some((row) => row._id === String(doc._id))).toBe(true);
  });

  it("deletes a review via admin service", async () => {
    const doc = await Review.create({
      productId,
      productVariantId: variantId,
      userId: otherUserId,
      rating: 2,
      title: "Remove me",
      comment: "Test delete",
      status: "rejected",
    });

    const result = await deleteAdminReview(String(doc._id));
    expect(result.ok).toBe(true);

    const gone = await Review.findById(doc._id);
    expect(gone).toBeNull();
  });

  it("bulk-deletes reviews via admin service", async () => {
    const a = await Review.create({
      productId,
      productVariantId: variantId,
      userId,
      rating: 1,
      status: "pending",
    });
    const b = await Review.create({
      productId,
      productVariantId: variantId,
      userId: otherUserId,
      rating: 2,
      status: "pending",
    });

    const result = await bulkDeleteAdminReviews([String(a._id), String(b._id)]);
    expect(result.ok).toBe(true);
    expect(result.deletedCount).toBe(2);
  });
});
