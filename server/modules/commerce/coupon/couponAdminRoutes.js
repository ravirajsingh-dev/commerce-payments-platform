const express = require("express");
const { AdminAuth } = require("../../../shared/middleware/auth");
const controller = require("./couponAdminController");
const {
  listAdminCouponsValidators,
  createCouponValidators,
  updateCouponValidators,
  getCouponValidators,
  setCouponStatusValidators,
} = require("./couponAdminValidation");

const router = express.Router();

router.get("/list", AdminAuth, listAdminCouponsValidators, controller.listAdminCoupons);
router.get("/:couponId", AdminAuth, getCouponValidators, controller.getAdminCouponById);
router.post("/", AdminAuth, createCouponValidators, controller.createAdminCoupon);
router.put(
  "/:couponId",
  AdminAuth,
  updateCouponValidators,
  controller.updateAdminCoupon,
);
router.patch(
  "/:couponId/status",
  AdminAuth,
  setCouponStatusValidators,
  controller.setAdminCouponStatus,
);
router.delete(
  "/:couponId",
  AdminAuth,
  getCouponValidators,
  controller.deleteAdminCoupon,
);

module.exports = router;
