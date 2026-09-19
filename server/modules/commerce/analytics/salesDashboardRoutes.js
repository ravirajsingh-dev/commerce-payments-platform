const express = require("express");
const { AdminAuth } = require("../../../shared/middleware/auth");
const controller = require("./salesDashboardController");
const { getSalesDashboardValidators } = require("./salesDashboardValidation");

const router = express.Router();

router.get(
  "/",
  AdminAuth,
  getSalesDashboardValidators,
  controller.getSalesDashboard,
);

module.exports = router;
