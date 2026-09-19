const mongoose = require("mongoose");

const response = require("../../config/response");
const storeService = require("./storeService");

const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const slugValue = String(slug || "").trim();
    if (!slugValue) {
      return response.errorResponse(
        res,
        [{ path: "slug", msg: "Slug is required." }],
        "Validation Error",
        400,
      );
    }

    const result = await storeService.getProductBySlug(slugValue, {
      sort: req.query.sort,
    });
    if (!result) {
      return response.errorResponse(
        res,
        [{ msg: "Product not found." }],
        "Product not found.",
        404,
      );
    }

    return response.successResponse(res, result, "Product fetched successfully.");
  } catch (err) {
    console.error("Store getProductBySlug:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

const listCatalogProducts = async (_req, res) => {
  try {
    const result = await storeService.listCatalogProducts();
    return response.successResponse(
      res,
      result,
      "Catalog products fetched successfully.",
    );
  } catch (err) {
    console.error("Store listCatalogProducts:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

const getProductVariantsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const slugValue = String(slug || "").trim();
    if (!slugValue) {
      return response.errorResponse(
        res,
        [{ path: "slug", msg: "Slug is required." }],
        "Validation Error",
        400,
      );
    }

    const result = await storeService.getProductVariantsBySlug(slugValue);
    if (!result) {
      return response.errorResponse(
        res,
        [{ msg: "Product not found." }],
        "Product not found.",
        404,
      );
    }

    return response.successResponse(res, result, "Product variants fetched successfully.");
  } catch (err) {
    console.error("Store getProductVariantsBySlug:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

const listAllStorefrontVariants = async (req, res) => {
  try {
    const result = await storeService.listAllStorefrontVariants(req.query);
    return response.successResponse(
      res,
      result,
      "Catalog variants fetched successfully.",
    );
  } catch (err) {
    console.error("Store listAllStorefrontVariants:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

const listNewArrivalStorefrontVariants = async (_req, res) => {
  try {
    const result = await storeService.listNewArrivalStorefrontVariants();
    return response.successResponse(
      res,
      result,
      "New arrival variants fetched successfully.",
    );
  } catch (err) {
    console.error("Store listNewArrivalStorefrontVariants:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

const searchStoreCatalog = async (req, res) => {
  try {
    const result = await storeService.searchStorefrontCatalog(req.query);
    if (result.ok === false) {
      return response.errorResponse(
        res,
        result.errors || {},
        "Invalid search filters.",
        400,
      );
    }
    return response.successResponse(res, result, "Search completed.");
  } catch (err) {
    console.error("Store searchStoreCatalog:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

const getVariantById = async (req, res) => {
  try {
    const { variant_id: variantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return response.errorResponse(
        res,
        [{ path: "variant_id", msg: "Invalid variant id." }],
        "Validation Error",
        400,
      );
    }

    const result = await storeService.getVariantById(variantId);
    if (!result) {
      return response.errorResponse(
        res,
        [{ msg: "Product variant not found." }],
        "Product variant not found.",
        404,
      );
    }

    return response.successResponse(
      res,
      result,
      "Product variant fetched successfully.",
    );
  } catch (err) {
    console.error("Store getVariantById:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

const getStoreNavigation = async (_req, res) => {
  try {
    const result = await storeService.getStoreNavigation();
    return response.successResponse(
      res,
      result,
      "Store navigation fetched successfully.",
    );
  } catch (err) {
    console.error("Store getStoreNavigation:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

const listStorefrontCategories = async (_req, res) => {
  try {
    const result = await storeService.listStorefrontCategories();
    return response.successResponse(
      res,
      result,
      "Categories fetched successfully.",
    );
  } catch (err) {
    console.error("Store listStorefrontCategories:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

const listStorefrontVariantsByCategory = async (req, res) => {
  try {
    const slugValue = String(req.params.slug || "").trim();
    if (!slugValue) {
      return response.errorResponse(
        res,
        [{ path: "slug", msg: "Slug is required." }],
        "Validation Error",
        400,
      );
    }

    const result = await storeService.listStorefrontVariantsByCategorySlug(
      slugValue,
      req.query,
    );
    if (!result) {
      return response.errorResponse(
        res,
        [{ msg: "Category not found." }],
        "Category not found.",
        404,
      );
    }

    return response.successResponse(
      res,
      result,
      "Category variants fetched successfully.",
    );
  } catch (err) {
    console.error("Store listStorefrontVariantsByCategory:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports = {
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
};
