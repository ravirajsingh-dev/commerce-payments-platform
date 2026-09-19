const express = require("express");
const router = express.Router();

router.use("/auth/admin", require("./auth/adminAuthRoutes"));
router.use("/admin/users", require("./usersRoutes"));
router.use("/admin/categories", require("./category/categoryRoutes"));
router.use(
  "/admin/store-nav-sections",
  require("./store-nav-section/storeNavSectionRoutes"),
);
router.use("/admin/attribute-sets", require("./attribute-set/attributeSetRoutes"));
router.use("/admin/attributes", require("./attribute/attributeRoutes"));
router.use("/admin/products", require("./product/productRoutes"));
router.use("/admin/claim-policies", require("./claim-policy/claimPolicyRoutes"));
router.use("/admin/product-variants", require("./product-variant/productVariantRoutes"));
router.use("/admin/orders", require("../commerce/order/orderAdminRoutes"));
router.use(
  "/admin/inventory",
  require("../commerce/inventory/inventoryAdminRoutes"),
);
router.use("/admin/coupons", require("../commerce/coupon/couponAdminRoutes"));
router.use("/admin/carriers", require("./carrier/carrierRoutes"));
router.use("/admin/reviews", require("../commerce/review/reviewAdminRoutes"));
router.use(
  "/admin/analytics/sales",
  require("../commerce/analytics/salesDashboardRoutes"),
);
router.use("/admin/homepage", require("./homepage/homepageRoutes"));
router.use(
  "/admin/bespoke-appointment",
  require("./bespoke-appointment/bespokeAppointmentAdminRoutes"),
);
router.use("/admin", require("./settingsRoutes"));
router.use("/admin", require("./legal-pages/legalPageRoutes"));
router.use("/admin", require("./profileRoutes"));

module.exports = router;
