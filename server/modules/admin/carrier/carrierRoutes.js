const express = require("express");
const { check, body } = require("express-validator");
const router = express.Router();
const {
  FULFILLMENT_MODE_VALUES,
  isOfflineFulfillmentMode,
} = require("../../../shared/constants/carrier");

const { AdminAuth } = require("../../../shared/middleware/auth");
const {
  getCarriersList,
  getCarrierById,
  createCarrier,
  updateCarrier,
  deleteCarrier,
} = require("./carrierController");

router.get("/list", AdminAuth, getCarriersList);
router.get("/:carrier_id", AdminAuth, getCarrierById);

router.post(
  "/create",
  [
    AdminAuth,
    check("name", "Name is required")
      .trim()
      .notEmpty()
      .isLength({ min: 2, max: 120 }),
    check("slug").optional({ checkFalsy: true }).trim(),
    check("fulfillmentMode")
      .optional()
      .isIn(FULFILLMENT_MODE_VALUES)
      .withMessage("Invalid fulfillment mode."),
    check("trackingUrl").optional({ checkFalsy: true }).trim(),
    body().custom((_, { req }) => {
      const mode = String(req.body?.fulfillmentMode || "online").trim().toLowerCase();
      const url = String(req.body?.trackingUrl || "").trim();
      if (!isOfflineFulfillmentMode(mode) && !url) {
        throw new Error("Tracking URL is required for online carriers.");
      }
      if (url) {
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            throw new Error("Tracking URL must use http or https.");
          }
        } catch {
          throw new Error("Tracking URL must be a valid URL with protocol.");
        }
      }
      return true;
    }),
    check("isActive")
      .optional()
      .isBoolean()
      .withMessage("Invalid active status value."),
  ],
  createCarrier,
);

router.put(
  "/:carrier_id",
  [
    AdminAuth,
    check("name").optional().trim().notEmpty().isLength({ min: 2, max: 120 }),
    check("slug").optional({ checkFalsy: true }).trim(),
    check("fulfillmentMode")
      .optional()
      .isIn(FULFILLMENT_MODE_VALUES)
      .withMessage("Invalid fulfillment mode."),
    check("trackingUrl").optional({ checkFalsy: true }).trim(),
    body().custom((_, { req }) => {
      const mode = req.body?.fulfillmentMode;
      const url = req.body?.trackingUrl;
      if (url === undefined && mode === undefined) {
        return true;
      }
      const resolvedMode = String(mode || "online").trim().toLowerCase();
      const resolvedUrl = url === undefined ? null : String(url).trim();
      if (resolvedUrl === null) {
        return true;
      }
      if (!isOfflineFulfillmentMode(resolvedMode) && !resolvedUrl) {
        throw new Error("Tracking URL is required for online carriers.");
      }
      if (resolvedUrl) {
        try {
          const parsed = new URL(resolvedUrl);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            throw new Error("Tracking URL must use http or https.");
          }
        } catch {
          throw new Error("Tracking URL must be a valid URL with protocol.");
        }
      }
      return true;
    }),
    check("isActive")
      .optional()
      .isBoolean()
      .withMessage("Invalid active status value."),
  ],
  updateCarrier,
);

router.delete("/:carrier_id", AdminAuth, deleteCarrier);

module.exports = router;
