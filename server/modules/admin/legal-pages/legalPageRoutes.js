const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../../shared/middleware/auth");
const { checkPermission } = require("../../../shared/middleware/permissions");
const controller = require("./legalPageController");

const auth = [AdminAuth, checkPermission("application-settings")];

router.get("/legal-pages", auth, controller.listLegalPages);
router.get("/legal-pages/:slug", auth, controller.getLegalPage);
router.put("/legal-pages/:slug", auth, controller.updateLegalPage);

module.exports = router;
