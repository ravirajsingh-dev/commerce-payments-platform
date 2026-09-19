const express = require("express");
const { AdminAuth } = require("../../../shared/middleware/auth");
const controller = require("./orderAdminController");
const {
  listAdminOrdersValidators,
  getAdminOrderValidators,
  updateAdminOrderValidators,
  cancelAdminOrderValidators,
  patchOrderAddressSnapshotValidators,
  listAdminClaimsValidators,
  createAdminClaimRequestValidators,
  approveRejectClaimValidators,
  rejectClaimValidators,
  patchClaimValidators,
  completeClaimValidators,
} = require("./orderAdminValidation");
const { claimEvidenceUploadValidators } = require("./orderValidation");
const { uploadClaimEvidence } = require("./orderClaimEvidenceUpload");
const { checkPermission } = require("../../../shared/middleware/permissions");

const router = express.Router();

router.use(
  "/:orderNo/shipment",
  require("./shipment/shipmentAdminRoutes"),
);

router.get(
  "/list",
  AdminAuth,
  listAdminOrdersValidators,
  controller.listAdminOrders,
);
router.get(
  "/claims/list",
  AdminAuth,
  checkPermission("order-claims", "list"),
  listAdminClaimsValidators,
  controller.listAdminClaims,
);
router.get(
  "/claims/meta",
  AdminAuth,
  checkPermission("order-claims", "list"),
  controller.getAdminClaimCatalog,
);
router.get(
  "/:orderNo/claim",
  AdminAuth,
  checkPermission("order-claims", "manage"),
  getAdminOrderValidators,
  controller.getAdminClaimByOrderNo,
);
router.post(
  "/:orderNo/claim/request",
  AdminAuth,
  checkPermission("order-claims", "manage"),
  createAdminClaimRequestValidators,
  controller.createAdminClaimRequest,
);
router.post(
  "/:orderNo/claim-evidence/upload",
  AdminAuth,
  checkPermission("order-claims", "manage"),
  uploadClaimEvidence,
  claimEvidenceUploadValidators,
  controller.uploadAdminClaimEvidence,
);
router.post(
  "/:orderNo/claim/approve",
  AdminAuth,
  checkPermission("order-claims", "manage"),
  approveRejectClaimValidators,
  controller.approveAdminClaim,
);
router.post(
  "/:orderNo/claim/reject",
  AdminAuth,
  checkPermission("order-claims", "manage"),
  rejectClaimValidators,
  controller.rejectAdminClaim,
);
router.patch(
  "/:orderNo/claim",
  AdminAuth,
  checkPermission("order-claims", "manage"),
  patchClaimValidators,
  controller.patchAdminClaim,
);
router.post(
  "/:orderNo/claim/complete",
  AdminAuth,
  checkPermission("order-claims", "manage"),
  completeClaimValidators,
  controller.completeAdminClaim,
);
router.get(
  "/:orderNo",
  AdminAuth,
  getAdminOrderValidators,
  controller.getAdminOrderByOrderNo,
);
router.patch(
  "/:orderNo",
  AdminAuth,
  updateAdminOrderValidators,
  controller.updateAdminOrder,
);
router.post(
  "/:orderNo/cancel",
  AdminAuth,
  cancelAdminOrderValidators,
  controller.cancelAdminOrder,
);
router.patch(
  "/:orderNo/address-snapshot",
  AdminAuth,
  patchOrderAddressSnapshotValidators,
  controller.patchAdminOrderAddressSnapshot,
);

module.exports = router;
