const express = require("express");
const { UserAuth } = require("../../../shared/middleware/auth");
const controller = require("./couponController");
const {
  validateCouponValidators,
  applyCouponValidators,
} = require("./couponValidation");

const router = express.Router();

router.get("/available", UserAuth, controller.listAvailableCouponsHandler);
router.post(
  "/validate",
  UserAuth,
  validateCouponValidators,
  controller.validateCouponHandler,
);
router.post("/apply", UserAuth, applyCouponValidators, controller.applyCouponHandler);
router.delete("/", UserAuth, controller.removeCouponHandler);

module.exports = router;
