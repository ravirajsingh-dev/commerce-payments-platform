const express = require("express");
const { UserAuth } = require("../../../shared/middleware/auth");
const controller = require("./orderController");
const {
  listUserOrdersValidators,
  getUserOrderValidators,
  getUserOrderInvoiceValidators,
  cancelRequestValidators,
  claimRequestValidators,
  claimEvidenceUploadValidators,
  claimReturnShipmentValidators,
} = require("./orderValidation");
const { uploadClaimEvidence } = require("./orderClaimEvidenceUpload");

const router = express.Router();

router.get("/", UserAuth, listUserOrdersValidators, controller.listUserOrders);
router.post(
  "/:orderNo/cancel-request",
  UserAuth,
  cancelRequestValidators,
  controller.requestOrderCancellation,
);
router.post(
  "/:orderNo/claim-request",
  UserAuth,
  claimRequestValidators,
  controller.requestOrderClaim,
);
router.post(
  "/:orderNo/claim-evidence/upload",
  UserAuth,
  uploadClaimEvidence,
  claimEvidenceUploadValidators,
  controller.uploadClaimEvidence,
);
router.post(
  "/:orderNo/claim-return-shipment",
  UserAuth,
  claimReturnShipmentValidators,
  controller.submitClaimReturnShipment,
);
router.get(
  "/:orderNo/invoice",
  UserAuth,
  getUserOrderInvoiceValidators,
  controller.getUserOrderInvoice,
);
router.get(
  "/:orderNo",
  UserAuth,
  getUserOrderValidators,
  controller.getUserOrderByOrderNo,
);

module.exports = router;
