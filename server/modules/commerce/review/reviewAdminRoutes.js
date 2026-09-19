const express = require("express");
const { AdminAuth } = require("../../../shared/middleware/auth");
const controller = require("./reviewAdminController");
const {
  listAdminReviewsValidators,
  getReviewValidators,
  setReviewStatusValidators,
  bulkDeleteReviewsValidators,
} = require("./reviewAdminValidation");

const router = express.Router();

router.get("/list", AdminAuth, listAdminReviewsValidators, controller.listAdminReviews);
router.post(
  "/bulk-delete",
  AdminAuth,
  bulkDeleteReviewsValidators,
  controller.bulkDeleteAdminReviews,
);
router.get("/:reviewId", AdminAuth, getReviewValidators, controller.getAdminReviewById);
router.patch(
  "/:reviewId/status",
  AdminAuth,
  setReviewStatusValidators,
  controller.setAdminReviewStatus,
);
router.delete(
  "/:reviewId",
  AdminAuth,
  getReviewValidators,
  controller.deleteAdminReview,
);

module.exports = router;
