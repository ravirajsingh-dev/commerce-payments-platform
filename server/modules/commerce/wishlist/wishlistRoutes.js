const express = require("express");
const { UserAuth } = require("../../../shared/middleware/auth");
const controller = require("./wishlistController");
const {
  addWishlistItemValidators,
  removeWishlistItemValidators,
  toggleWishlistItemValidators,
} = require("./wishlistValidation");

const router = express.Router();

router.get("/", UserAuth, controller.getWishlistHandler);
router.post("/items", UserAuth, addWishlistItemValidators, controller.addWishlistItemHandler);
router.post(
  "/items/:variantId/toggle",
  UserAuth,
  toggleWishlistItemValidators,
  controller.toggleWishlistItemHandler,
);
router.delete(
  "/items/:variantId",
  UserAuth,
  removeWishlistItemValidators,
  controller.removeWishlistItemHandler,
);

module.exports = router;
