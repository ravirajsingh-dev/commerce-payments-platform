const fs = require("fs");
const path = require("path");

describe("commerce module scaffold", () => {
  const commerceRoutesPath = path.join(
    __dirname,
    "../../../modules/commerce/commerceRoutes.js",
  );

  it("exports a routes router from the commerce module index", () => {
    const commerceIndexSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/index.js"),
      "utf8",
    );

    expect(commerceIndexSource).toContain('routes: require("./commerceRoutes")');
  });

  it("mounts cart, checkout, and orders routers", () => {
    const commerceRoutesSource = fs.readFileSync(commerceRoutesPath, "utf8");
    const adminRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/admin/adminRoutes.js"),
      "utf8",
    );

    expect(commerceRoutesSource).toContain('./cart/cartRoutes');
    expect(commerceRoutesSource).toContain('./checkout/checkoutRoutes');
    expect(commerceRoutesSource).toContain('./order/orderRoutes');
    expect(commerceRoutesSource).toContain('./review/reviewRoutes');
    expect(commerceRoutesSource).toContain('./wishlist/wishlistRoutes');
    expect(adminRoutesSource).toContain('"/admin/orders"');
    expect(adminRoutesSource).toContain('"/admin/inventory"');
  });

  it("registers commerce routes in the routes loader", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../../bootstrap/loaders/routesLoader.js"),
      "utf8",
    );

    expect(source).toContain('require("../../modules/commerce")');
    expect(source).toContain("app.use(\"/api\", commerceModule.routes)");
  });

  it("includes placeholder modules for later commerce phases", () => {
    const adminRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/admin/adminRoutes.js"),
      "utf8",
    );
    const addressRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/address/addressRoutes.js"),
      "utf8",
    );
    const cartRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/cart/cartRoutes.js"),
      "utf8",
    );

    expect(addressRoutesSource).toContain("UserAuth");
    expect(cartRoutesSource).toContain("UserAuth");
    expect(cartRoutesSource).toContain("OptionalUserAuth");
    expect(cartRoutesSource).toContain("CartReadAccess");
    expect(cartRoutesSource).toContain("CartWriteAccess");
    expect(cartRoutesSource).toContain('"/merge"');
    expect(cartRoutesSource).toContain('"/items"');
    const cart = require("../../../modules/commerce/cart/cartService");
    expect(typeof cart.addCartItem).toBe("function");
    expect(typeof cart.getCart).toBe("function");
    expect(typeof cart.updateCartItem).toBe("function");
    expect(typeof cart.removeCartItem).toBe("function");
    const orderAdminRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/order/orderAdminRoutes.js"),
      "utf8",
    );
    expect(orderAdminRoutesSource).toContain("AdminAuth");
    expect(orderAdminRoutesSource).toContain("listAdminOrders");
    const inventory = require("../../../modules/commerce/inventory/inventoryService");
    const stockAdjustment = require("../../../modules/commerce/inventory/stockAdjustment");
    const lowStock = require("../../../modules/commerce/inventory/lowStock");
    expect(typeof inventory.getAvailableStock).toBe("function");
    expect(typeof inventory.decrementStock).toBe("function");
    expect(typeof inventory.releaseStock).toBe("function");
    expect(typeof lowStock.listLowStock).toBe("function");
    const inventoryAdminRoutesSource = fs.readFileSync(
      path.join(
        __dirname,
        "../../../modules/commerce/inventory/inventoryAdminRoutes.js",
      ),
      "utf8",
    );
    expect(inventoryAdminRoutesSource).toContain("/low-stock");
    expect(inventoryAdminRoutesSource).toContain("/stock-adjustments");
    expect(inventoryAdminRoutesSource).toContain("AdminAuth");
    expect(typeof inventory.adjustStock).toBe("function");
    expect(typeof stockAdjustment.createStockAdjustment).toBe("function");
    expect(typeof stockAdjustment.listStockAdjustments).toBe("function");
    const orderNumberGenerator = require("../../../modules/commerce/order/orderNumberGenerator");
    expect(typeof orderNumberGenerator.generateOrderNo).toBe("function");
    expect(typeof orderNumberGenerator.isValidOrderNoFormat).toBe("function");
    expect(orderAdminRoutesSource).toContain("/:orderNo/address-snapshot");
    const orderAddressSnapshot = require("../../../modules/commerce/order/orderAddressSnapshot");
    expect(typeof orderAddressSnapshot.patchAdminOrderAddressSnapshot).toBe("function");
    const checkoutPreview = require("../../../modules/commerce/checkout/checkoutPreviewService");
    const placeOrderService = require("../../../modules/commerce/checkout/placeOrderService");
    expect(typeof checkoutPreview.previewCheckout).toBe("function");
    expect(typeof checkoutPreview.resolveFlatShippingTotal).toBe("function");
    expect(typeof placeOrderService.placeOrder).toBe("function");
    const couponAdmin = require("../../../modules/commerce/coupon/couponAdminService");
    const coupon = require("../../../modules/commerce/coupon/couponService");
    expect(typeof couponAdmin.listAdminCoupons).toBe("function");
    expect(typeof couponAdmin.createAdminCoupon).toBe("function");
    expect(typeof coupon.applyCouponToCart).toBe("function");
    expect(typeof coupon.validateCouponForSubtotal).toBe("function");
    const couponRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/coupon/couponRoutes.js"),
      "utf8",
    );
    expect(cartRoutesSource).toContain("/coupons");
    expect(couponRoutesSource).toContain("/validate");
    expect(couponRoutesSource).toContain("/apply");
    const couponAdminRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/coupon/couponAdminRoutes.js"),
      "utf8",
    );
    expect(couponAdminRoutesSource).toContain("AdminAuth");
    expect(couponAdminRoutesSource).toContain("/list");
    expect(adminRoutesSource).toContain('"/admin/coupons"');
    const reviewStorefront = require("../../../modules/commerce/review/reviewService");
    const reviewAdmin = require("../../../modules/commerce/review/reviewAdminService");
    expect(typeof reviewStorefront.listApprovedReviewsForVariant).toBe("function");
    expect(typeof reviewStorefront.submitReview).toBe("function");
    expect(typeof reviewAdmin.listAdminReviews).toBe("function");
    expect(typeof reviewAdmin.setAdminReviewStatus).toBe("function");
    const reviewRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/review/reviewRoutes.js"),
      "utf8",
    );
    const reviewAdminRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/review/reviewAdminRoutes.js"),
      "utf8",
    );
    expect(reviewRoutesSource).toContain("/variants/:variantId");
    expect(reviewAdminRoutesSource).toContain("/list");
    expect(adminRoutesSource).toContain('"/admin/reviews"');
    const wishlist = require("../../../modules/commerce/wishlist/wishlistService");
    expect(typeof wishlist.getWishlist).toBe("function");
    expect(typeof wishlist.toggleWishlistItem).toBe("function");
    const wishlistRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/commerce/wishlist/wishlistRoutes.js"),
      "utf8",
    );
    expect(wishlistRoutesSource).toContain('"/items"');
    expect(wishlistRoutesSource).toContain("/toggle");
    const salesDashboard = require("../../../modules/commerce/analytics/salesDashboardService");
    const variantSales = require("../../../modules/commerce/analytics/variantSalesService");
    const customerAnalytics = require("../../../modules/commerce/analytics/customerAnalyticsService");
    expect(typeof salesDashboard.getSalesDashboardSummary).toBe("function");
    expect(typeof variantSales.buildVariantSalesMap).toBe("function");
    expect(typeof customerAnalytics.getCustomerOrderAnalytics).toBe("function");
    const usersRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/admin/usersRoutes.js"),
      "utf8",
    );
    expect(usersRoutesSource).toContain("/:user_id/analytics");
    expect(usersRoutesSource).toContain("getUserAnalytics");
    const storeServiceSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/store/storeService.js"),
      "utf8",
    );
    expect(storeServiceSource).toContain("buildVariantSalesMap");
    expect(storeServiceSource).toContain("compareVariantsByBestSelling");
    const salesDashboardRoutesSource = fs.readFileSync(
      path.join(
        __dirname,
        "../../../modules/commerce/analytics/salesDashboardRoutes.js",
      ),
      "utf8",
    );
    expect(salesDashboardRoutesSource).toContain("AdminAuth");
    expect(salesDashboardRoutesSource).toContain("getSalesDashboard");
    expect(adminRoutesSource).toContain('"/admin/analytics/sales"');
    const salesDashboardValidationSource = fs.readFileSync(
      path.join(
        __dirname,
        "../../../modules/commerce/analytics/salesDashboardValidation.js",
      ),
      "utf8",
    );
    expect(salesDashboardValidationSource).toContain("fromDate");
    expect(salesDashboardValidationSource).toContain("toDate");
    expect(salesDashboardValidationSource).toContain("period");
    const catalogFilters = require("../../../modules/store/catalogFilters");
    expect(typeof catalogFilters.parseCatalogSearchQuery).toBe("function");
    const storeRoutesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/store/storeRoutes.js"),
      "utf8",
    );
    expect(storeRoutesSource).toContain("catalogSearchValidators");
  });
});
