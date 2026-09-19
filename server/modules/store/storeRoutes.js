const express = require("express");

const {
  getProductBySlug,
  getProductVariantsBySlug,
  getVariantById,
  listAllStorefrontVariants,
  listNewArrivalStorefrontVariants,
  searchStoreCatalog,
  listCatalogProducts,
  getStoreNavigation,
  listStorefrontCategories,
  listStorefrontVariantsByCategory,
} = require("./storeController");

const { catalogSearchValidators } = require("./storeSearchValidation");

const router = express.Router();

router.get("/navigation", getStoreNavigation);
router.get("/categories", listStorefrontCategories);
router.get("/categories/:slug/variants", catalogSearchValidators, listStorefrontVariantsByCategory);
router.get("/catalog/search", catalogSearchValidators, searchStoreCatalog);
router.get("/catalog/all-variants", catalogSearchValidators, listAllStorefrontVariants);
router.get("/catalog/new-arrivals", listNewArrivalStorefrontVariants);
router.get("/products", listCatalogProducts);
router.get("/products/:slug/variants", getProductVariantsBySlug);
router.get("/products/:slug", getProductBySlug);
router.get("/variants/:variant_id", getVariantById);

module.exports = router;
