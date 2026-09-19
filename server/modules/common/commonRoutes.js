const express = require("express");
const router = express.Router();

const { getPublicCommonSettings } = require("./commonController");
const { getHomepageContent } = require("./homepageController");
const { getPublicLegalPage } = require("./legalPageController");

// @route GET /api/common/settings
// @desc Get public common settings for the client app
// @access Public
router.get("/settings", [], getPublicCommonSettings);
router.get("/homepage", [], getHomepageContent);
router.get("/legal-pages/:slug", [], getPublicLegalPage);
router.use(
  "/bespoke-appointment",
  require("./bespokeAppointmentPublicRoutes"),
);

module.exports = router;
