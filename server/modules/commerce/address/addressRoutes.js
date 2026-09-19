const express = require("express");
const { UserAuth } = require("../../../shared/middleware/auth");
const controller = require("./addressController");
const {
  createAddressValidators,
  updateAddressValidators,
} = require("./addressValidation");

const router = express.Router();

router.get("/", UserAuth, controller.listAddresses);
router.post("/", UserAuth, createAddressValidators, controller.createAddress);
router.post("/:id/set-default", UserAuth, controller.setDefaultAddress);
router.patch("/:id", UserAuth, updateAddressValidators, controller.updateAddress);
router.delete("/:id", UserAuth, controller.deleteAddress);

module.exports = router;
