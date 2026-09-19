const express = require("express");
const { AdminAuth } = require("../../../shared/middleware/auth");
const controller = require("./inventoryAdminController");
const {
  createStockAdjustmentValidators,
  listStockAdjustmentsValidators,
} = require("./inventoryAdminValidation");

const router = express.Router();

router.get("/low-stock", AdminAuth, controller.listLowStock);
router.get(
  "/stock-adjustments/reasons",
  AdminAuth,
  controller.listStockAdjustmentReasons,
);
router.get(
  "/stock-adjustments",
  AdminAuth,
  listStockAdjustmentsValidators,
  controller.listStockAdjustments,
);
router.post(
  "/stock-adjustments",
  AdminAuth,
  createStockAdjustmentValidators,
  controller.createStockAdjustment,
);

module.exports = router;
