const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const productService = require("./productService");

const getProductsList = async (req, res) => {
  try {
    const result = await productService.getProductsList(req);
    if (result?.validationError) {
      return response.errorResponse(
        res,
        result.validationError,
        "Validation Error",
        400,
      );
    }

    return response.successResponse(res, result.data, result.message);
  } catch (err) {
    console.error("Error fetching products:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getProductById = async (req, res) => {
  try {
    const { product_id: productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return response.errorResponse(
        res,
        [{ path: "product_id", msg: "Invalid product id." }],
        "Validation Error",
        400,
      );
    }

    const product = await productService.getProductById(productId);
    if (!product) {
      return response.errorResponse(
        res,
        [{ msg: "Product not found." }],
        "Product not found.",
        404,
      );
    }

    return response.successResponse(res, product, "Product details");
  } catch (err) {
    console.error("Error fetching product details:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const createProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const {
      name,
      slug,
      primaryCategoryId,
      categoryIds = [],
      attributeSetId,
      attributes = {},
      description = "",
      deliveryDescription = "",
      purchaseNote = "",
      seo = {},
      searchKeywords = [],
      status = 1,
      sizeChart,
      claimPolicyId = null,
    } = req.body;

    const normalizedSlug = productService.generateSlug(slug || name);
    const slugTaken = await productService.isSlugTaken(normalizedSlug);
    if (slugTaken) {
      return response.errorResponse(
        res,
        [{ path: "slug", msg: "Provided slug is already in use." }],
        "Validation Error",
        400,
      );
    }

    const created = await productService.createProduct({
      name,
      slug,
      primaryCategoryId,
      categoryIds,
      attributeSetId,
      attributes,
      description,
      deliveryDescription,
      purchaseNote,
      seo,
      searchKeywords,
      status,
      sizeChart,
      claimPolicyId,
    });

    return response.successResponse(res, created, "Product created successfully.");
  } catch (err) {
    console.error("Error creating product:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const updateProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { product_id: productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return response.errorResponse(
        res,
        [{ path: "product_id", msg: "Invalid product id." }],
        "Validation Error",
        400,
      );
    }

    const {
      name,
      slug,
      primaryCategoryId,
      categoryIds,
      attributeSetId,
      attributes,
      description,
      deliveryDescription,
      purchaseNote,
      seo,
      searchKeywords,
      status,
      sizeChart,
      claimPolicyId,
    } = req.body;

    const normalizedSlug = productService.generateSlug(slug || name || "");
    if (normalizedSlug) {
      const slugTaken = await productService.isSlugTaken(normalizedSlug, productId);
      if (slugTaken) {
        return response.errorResponse(
          res,
          [{ path: "slug", msg: "Provided slug is already in use." }],
          "Validation Error",
          400,
        );
      }
    }

    const updated = await productService.updateProduct(productId, {
      name,
      slug,
      primaryCategoryId,
      categoryIds,
      attributeSetId,
      attributes,
      description,
      deliveryDescription,
      purchaseNote,
      seo,
      searchKeywords,
      status,
      sizeChart,
      claimPolicyId,
    });
    if (!updated) {
      return response.errorResponse(
        res,
        [{ msg: "Product not found." }],
        "Product not found.",
        404,
      );
    }

    return response.successResponse(res, updated, "Product updated successfully.");
  } catch (err) {
    console.error("Error updating product:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { product_id: productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return response.errorResponse(
        res,
        [{ path: "product_id", msg: "Invalid product id." }],
        "Validation Error",
        400,
      );
    }

    const variantsExist = await productService.hasVariants(productId);
    if (variantsExist) {
      return response.errorResponse(
        res,
        [
          {
            msg: "Product has one or more variants. Delete all variants before deleting this product.",
          },
        ],
        "Validation Error",
        400,
      );
    }

    const deleted = await productService.deleteProduct(productId);
    if (!deleted) {
      return response.errorResponse(
        res,
        [{ msg: "Product not found." }],
        "Product not found.",
        404,
      );
    }

    return response.successResponse(res, {}, "Product deleted successfully.");
  } catch (err) {
    console.error("Error deleting product:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const parseJsonField = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  }
  return value;
};

const normalizeBodyForProduct = (body = {}) => {
  const normalized = { ...body };
  normalized.categoryIds = parseJsonField(body.categoryIds, body.categoryIds || []);
  normalized.searchKeywords = parseJsonField(
    body.searchKeywords,
    body.searchKeywords || [],
  );
  normalized.attributes = parseJsonField(body.attributes, body.attributes || {});
  normalized.seo = parseJsonField(body.seo, body.seo || {});
  if (body.sizeChart !== undefined) {
    normalized.sizeChart = parseJsonField(body.sizeChart, body.sizeChart);
  }
  return normalized;
};

const createProductWithUploads = async (req, res) => {
  req.body = normalizeBodyForProduct(req.body);
  return createProduct(req, res);
};

const updateProductWithUploads = async (req, res) => {
  req.body = normalizeBodyForProduct(req.body);
  return updateProduct(req, res);
};

module.exports = {
  getProductsList,
  getProductById,
  createProduct: createProductWithUploads,
  updateProduct: updateProductWithUploads,
  deleteProduct,
};
