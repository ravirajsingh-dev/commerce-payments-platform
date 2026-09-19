/** Default page size for admin list APIs (must match admin client DEFAULT_PAGE_SIZE). */
const DEFAULT_PAGE_SIZE = 20;

const excludedPaths = [
  "/api/auth/users",
  "/api/auth",
  "/api/common/settings",
  "/api/admin/settings",
  "/api/common/homepage",
  "/api/common/legal-pages",
  "/api/common/bespoke-appointment",
  "/api/store",
  // Guest/user cart (OptionalUserAuth) — not public storefront; skips user session cookie check
  "/api/cart",
];

module.exports = { excludedPaths, DEFAULT_PAGE_SIZE };
