const express = require("express");
const { UserAuth } = require("../../../shared/middleware/auth");
const { OptionalUserAuth } = require("./cartOptionalAuth");
const { CartReadAccess, CartWriteAccess } = require("./cartAccess");
const controller = require("./cartController");
const {
  addCartItemValidators,
  updateCartItemValidators,
  removeCartItemValidators,
} = require("./cartValidation");

const router = express.Router();

router.get("/", OptionalUserAuth, CartReadAccess, controller.getCart);
router.post(
  "/items",
  OptionalUserAuth,
  CartWriteAccess,
  addCartItemValidators,
  controller.addCartItem,
);
router.patch(
  "/items",
  OptionalUserAuth,
  CartWriteAccess,
  updateCartItemValidators,
  controller.updateCartItem,
);
router.delete(
  "/items/:variantId",
  OptionalUserAuth,
  CartWriteAccess,
  removeCartItemValidators,
  controller.removeCartItem,
);
router.post("/merge", UserAuth, controller.mergeGuestCart);
router.use("/coupons", require("../coupon/couponRoutes"));

module.exports = router;
