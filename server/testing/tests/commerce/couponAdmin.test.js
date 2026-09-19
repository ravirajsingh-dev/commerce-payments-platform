const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const fs = require("fs");
const path = require("path");

const Coupon = require("../../../models/Coupon");
const {
  listAdminCoupons,
  getAdminCouponById,
  createAdminCoupon,
  updateAdminCoupon,
  setAdminCouponStatus,
  deleteAdminCoupon,
  COUPON_ADMIN_ERROR,
} = require("../../../modules/commerce/coupon/couponAdminService");

describe("coupon admin CRUD (Phase 1)", () => {
  let mongoServer;
  let couponId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-coupon-admin-tests",
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("creates a percentage coupon", async () => {
    const result = await createAdminCoupon({
      code: "save10",
      title: "Save 10%",
      discountType: "percentage",
      discountValue: 10,
      minOrderAmount: 500,
      maxDiscountAmount: 200,
      usageLimit: 100,
      status: 1,
    });

    expect(result.ok).toBe(true);
    expect(result.coupon).toMatchObject({
      code: "SAVE10",
      title: "Save 10%",
      discountType: "percentage",
      discountValue: 10,
      minOrderAmount: 500,
      maxDiscountAmount: 200,
      usageLimit: 100,
      usedCount: 0,
      status: 1,
    });
    couponId = result.coupon._id;
  });

  it("rejects duplicate coupon codes", async () => {
    const result = await createAdminCoupon({
      code: "SAVE10",
      title: "Duplicate",
      discountType: "flat",
      discountValue: 50,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe(COUPON_ADMIN_ERROR.DUPLICATE_CODE);
    expect(result.statusCode).toBe(409);
  });

  it("lists coupons with summary", async () => {
    await createAdminCoupon({
      code: "FLAT50",
      title: "Flat fifty",
      discountType: "flat",
      discountValue: 50,
      status: 2,
    });

    const result = await listAdminCoupons({ page: 1, limit: 20 });
    expect(result.ok).toBe(true);
    expect(result.coupons.length).toBeGreaterThanOrEqual(2);
    expect(result.pagination.total).toBeGreaterThanOrEqual(2);
    expect(result.summary.active).toBeGreaterThanOrEqual(1);
    expect(result.summary.inactive).toBeGreaterThanOrEqual(1);
  });

  it("filters coupons by code", async () => {
    const result = await listAdminCoupons({ code: "flat50" });
    expect(result.ok).toBe(true);
    expect(result.coupons).toHaveLength(1);
    expect(result.coupons[0].code).toBe("FLAT50");
  });

  it("gets coupon by id", async () => {
    const result = await getAdminCouponById(couponId);
    expect(result.ok).toBe(true);
    expect(result.coupon.code).toBe("SAVE10");
  });

  it("updates coupon fields", async () => {
    const result = await updateAdminCoupon(couponId, {
      title: "Save 10% Updated",
      minOrderAmount: 1000,
    });

    expect(result.ok).toBe(true);
    expect(result.coupon.title).toBe("Save 10% Updated");
    expect(result.coupon.minOrderAmount).toBe(1000);
  });

  it("rejects usage limit below used count", async () => {
    await Coupon.updateOne({ _id: couponId }, { $set: { usedCount: 5 } });

    const result = await updateAdminCoupon(couponId, { usageLimit: 3 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe(COUPON_ADMIN_ERROR.USAGE_LIMIT_BELOW_USED);
  });

  it("disables coupon via status patch helper", async () => {
    const result = await setAdminCouponStatus(couponId, 2);
    expect(result.ok).toBe(true);
    expect(result.coupon.status).toBe(2);

    const stored = await Coupon.findById(couponId).lean();
    expect(stored.status).toBe(2);
  });

  it("stores terms and per-user usage limit", async () => {
    const result = await createAdminCoupon({
      code: "VIP1",
      title: "VIP once",
      discountType: "flat",
      discountValue: 100,
      termsAndConditions: "One use per account.",
      usageLimitPerUser: 1,
      status: 1,
    });

    expect(result.ok).toBe(true);
    expect(result.coupon.termsAndConditions).toBe("One use per account.");
    expect(result.coupon.usageLimitPerUser).toBe(1);
  });

  it("deletes unused coupon and blocks delete when used", async () => {
    const fresh = await createAdminCoupon({
      code: "DELME",
      title: "Delete me",
      discountType: "flat",
      discountValue: 10,
      status: 1,
    });
    expect(fresh.ok).toBe(true);

    const delOk = await deleteAdminCoupon(fresh.coupon._id);
    expect(delOk.ok).toBe(true);

    const delUsed = await deleteAdminCoupon(couponId);
    expect(delUsed.ok).toBe(false);
    expect(delUsed.error).toBe(COUPON_ADMIN_ERROR.HAS_USAGE);
  });

  it("mounts admin coupon routes behind AdminAuth", () => {
    const adminRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/admin/adminRoutes.js"),
      "utf8",
    );
    const couponRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/coupon/couponAdminRoutes.js"),
      "utf8",
    );

    expect(adminRoutesSource).toContain('"/admin/coupons"');
    expect(couponRoutesSource).toContain("AdminAuth");
    expect(couponRoutesSource).toContain("/list");
    expect(couponRoutesSource).toContain("/:couponId/status");
    expect(couponRoutesSource).toContain('router.delete');
  });
});
