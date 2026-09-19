const express = require("express");
const { UserAuth } = require("../../../shared/middleware/auth");
const controller = require("./reviewController");
const {
  listVariantReviewsValidators,
  submitReviewValidators,
  getOrderReviewContextValidators,
} = require("./reviewValidation");

const router = express.Router();

router.get(
  "/variants/:variantId",
  listVariantReviewsValidators,
  controller.listVariantReviewsHandler,
);
router.get(
  "/variants/:variantId/me",
  UserAuth,
  listVariantReviewsValidators,
  controller.getVariantReviewContextHandler,
);
router.get(
  "/orders/:orderNo",
  UserAuth,
  getOrderReviewContextValidators,
  controller.getOrderReviewContextHandler,
);
router.post("/", UserAuth, submitReviewValidators, controller.submitReviewHandler);

module.exports = router;
