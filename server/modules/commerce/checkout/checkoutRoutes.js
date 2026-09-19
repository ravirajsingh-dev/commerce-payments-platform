const express = require("express");
const { UserAuth } = require("../../../shared/middleware/auth");
const controller = require("./checkoutController");

const router = express.Router();

router.post("/validate-address", controller.validateCheckoutAddressHandler);
router.post("/preview", UserAuth, controller.previewCheckoutHandler);
router.post("/place", UserAuth, controller.placeOrderHandler);

module.exports = router;
