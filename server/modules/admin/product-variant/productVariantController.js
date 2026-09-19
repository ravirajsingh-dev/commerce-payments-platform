const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const Product = require("../../../models/Product");
const Attribute = require("../../../models/Attribute");
const CommonSettings = require("../../../models/CommonSettings");
const productVariantService = require("./productVariantService");
const { normalizeAttributesObject } = require("./productVariantHelpers");
const {
  validateVariantPayloadForProduct,
} = require("./productVariantAttributeValidation");
const {
  generateVariantSku,
  sortedVariantAttributeCodes,
} = require("../../../shared/utils/generateVariantSku");

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

/** Map Mongo duplicate key (11000) to validation errors; null if not a duplicate key. */
const validationErrorsFromDuplicateKey = (err) => {
  if (err?.code !== 11000) return null;
  const kp = err.keyPattern || {};
  if (kp.sku === 1) {
    return [{ path: "sku", msg: "Duplicate SKU." }];
  }
  if (kp.productId === 1 && kp.attributeFingerprint === 1) {
    return [
      {
        path: "attributes",
        msg:
          "This attribute combination conflicts with a legacy unique database index. Restart the API to repair indexes, or run: node server/scripts/fixProductVariantFingerprintIndex.js",
      },
    ];
  }
  return [{ path: "_id", msg: "Duplicate key constraint." }];
};

const getProductVariantsList = async (req, res) => {
  try {
    const result = await productVariantService.getProductVariantsList(req);
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
    console.error("Error fetching product variants:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getProductVariantsOverview = async (req, res) => {
  try {
    const result = await productVariantService.getProductVariantsOverview(req);
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
    console.error("Error fetching product variants overview:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getProductVariantById = async (req, res) => {
  try {
    const { product_variant_id: variantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return response.errorResponse(
        res,
        [{ path: "product_variant_id", msg: "Invalid product variant id." }],
        "Validation Error",
        400,
      );
    }

    const variant = await productVariantService.getProductVariantById(variantId);
    if (!variant) {
      return response.errorResponse(
        res,
        [{ msg: "Product variant not found." }],
        "Product variant not found.",
        404,
      );
    }

    return response.successResponse(res, variant, "Product variant details");
  } catch (err) {
    console.error("Error fetching product variant details:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getVariantsByProductId = async (req, res) => {
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

    const rows = await productVariantService.getVariantsByProductId(productId);
    return response.successResponse(res, rows, "Product variants");
  } catch (err) {
    console.error("Error fetching variants for product:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const createProductVariant = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const {
      productId,
      sku,
      name = "",
      shortDescription = "",
      attributes = {},
      price,
      discountType,
      discountValue,
      status = 1,
      isNewArrival = false,
      images,
      stock = 0,
      sizes,
    } = req.body;

    let parsedImages = [];
    if (Array.isArray(images)) {
      parsedImages = images;
    } else if (typeof images === "string") {
      try {
        parsedImages = JSON.parse(images);
      } catch (e) {
        parsedImages = [];
      }
    }

    const parsedSizes = parseJsonField(sizes, sizes);

    const variantValidation = await validateVariantPayloadForProduct(
      productId,
      attributes,
      Array.isArray(parsedSizes) ? parsedSizes : [],
    );
    if (variantValidation?.validationError) {
      return response.errorResponse(
        res,
        variantValidation.validationError,
        "Validation Error",
        400,
      );
    }

    const normalizedRequestSku = productVariantService.normalizeSku(sku);

    const resolveAutoSku = async () => {
      const product = await Product.findById(productId)
        .populate("primaryCategoryId", "name slug")
        .lean();
      if (!product) return null;
      const settings = await CommonSettings.findOne({ singletonKey: "GLOBAL" })
        .select("abbreviation")
        .lean();
      const defs = await Attribute.find({
        attributeSetId: product.attributeSetId,
        isVariant: true,
        inputType: "select",
      })
        .select("code isVariant inputType")
        .lean();
      const sortedCodes = sortedVariantAttributeCodes(defs || []);
      return generateVariantSku({
        brandCode: settings?.abbreviation || "RR",
        primaryCategory: product.primaryCategoryId,
        productId,
        attributes: normalizeAttributesObject(attributes),
        sizes: Array.isArray(parsedSizes) ? parsedSizes : [],
        sortedAttributeCodes: sortedCodes,
      });
    };

    let resolvedSku = normalizedRequestSku;
    const skuTaken = await productVariantService.isSkuTaken(resolvedSku);
    if (skuTaken) {
      const auto = await resolveAutoSku();
      if (!auto) {
        return response.errorResponse(
          res,
          [{ path: "productId", msg: "Product not found." }],
          "Validation Error",
          400,
        );
      }
      resolvedSku = auto;
      let guard = 0;
      while (
        (await productVariantService.isSkuTaken(resolvedSku)) &&
        guard < 6
      ) {
        resolvedSku = await resolveAutoSku();
        guard += 1;
      }
      if (await productVariantService.isSkuTaken(resolvedSku)) {
        return response.errorResponse(
          res,
          [{ path: "sku", msg: "Could not assign a unique SKU. Please retry." }],
          "Validation Error",
          400,
        );
      }
    }

    const isDupSkuIndex = (err) => {
      if (err?.code !== 11000) return false;
      if (err?.keyPattern && Object.prototype.hasOwnProperty.call(err.keyPattern, "sku"))
        return true;
      if (err?.keyValue && Object.prototype.hasOwnProperty.call(err.keyValue, "sku"))
        return true;
      const msg = String(err?.message || "");
      return /\bsku\b/i.test(msg) && msg.includes("dup key");
    };

    const MAX_SKU_INSERT_RETRIES = 5;
    let created;
    let lastErr;
    for (let attempt = 0; attempt <= MAX_SKU_INSERT_RETRIES; attempt += 1) {
      try {
        created = await productVariantService.createProductVariant({
          productId,
          sku: resolvedSku,
          name,
          shortDescription,
          attributes,
          price,
          discountType,
          discountValue,
          status,
          isNewArrival,
          images: Array.isArray(parsedImages) ? parsedImages : [],
          stock,
          sizes: Array.isArray(parsedSizes) ? parsedSizes : [],
        });
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        if (!isDupSkuIndex(err) || attempt === MAX_SKU_INSERT_RETRIES) {
          throw err;
        }
        const next = await resolveAutoSku();
        if (!next) throw err;
        resolvedSku = next;
      }
    }
    if (!created) throw lastErr;

    return response.successResponse(
      res,
      created,
      "Product variant created successfully.",
    );
  } catch (err) {
    console.error("Error creating product variant:", err);
    const dupErrors = validationErrorsFromDuplicateKey(err);
    if (dupErrors) {
      return response.errorResponse(res, dupErrors, "Validation Error", 400);
    }
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const updateProductVariant = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { product_variant_id: variantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return response.errorResponse(
        res,
        [{ path: "product_variant_id", msg: "Invalid product variant id." }],
        "Validation Error",
        400,
      );
    }

    const {
      sku,
      name,
      shortDescription,
      attributes,
      price,
      discountType,
      discountValue,
      status,
      isNewArrival,
      images,
      removedImagePublicIds,
      stock,
      sizes,
    } = req.body;

    const parsedAttributes = parseJsonField(attributes, attributes);
    const parsedImages = parseJsonField(images, images);
    const parsedRemoved = parseJsonField(removedImagePublicIds, removedImagePublicIds);
    const parsedSizes = parseJsonField(sizes, sizes);

    let variantDocForChecks = null;
    if (parsedAttributes !== undefined || sizes !== undefined) {
      variantDocForChecks = await productVariantService.getProductVariantById(variantId);
      if (!variantDocForChecks) {
        return response.errorResponse(
          res,
          [{ msg: "Product variant not found." }],
          "Product variant not found.",
          404,
        );
      }
      const productId =
        variantDocForChecks.productId?._id || variantDocForChecks.productId;
      const mergedAttributes =
        parsedAttributes !== undefined
          ? parsedAttributes
          : variantDocForChecks.attributes || {};
      const mergedSizes =
        sizes !== undefined
          ? Array.isArray(parsedSizes)
            ? parsedSizes
            : []
          : variantDocForChecks.sizes || [];
      const variantValidation = await validateVariantPayloadForProduct(
        productId,
        mergedAttributes,
        mergedSizes,
      );
      if (variantValidation?.validationError) {
        return response.errorResponse(
          res,
          variantValidation.validationError,
          "Validation Error",
          400,
        );
      }
    }

    if (sku !== undefined) {
      const skuTaken = await productVariantService.isSkuTaken(sku, variantId);
      if (skuTaken) {
        return response.errorResponse(
          res,
          [{ path: "sku", msg: "Provided SKU is already in use." }],
          "Validation Error",
          400,
        );
      }
    }

    const updated = await productVariantService.updateProductVariant(variantId, {
      sku,
      name,
      shortDescription,
      attributes: parsedAttributes !== undefined ? parsedAttributes : attributes,
      price,
      discountType,
      discountValue,
      status,
      isNewArrival,
      images: parsedImages !== undefined ? parsedImages : images,
      removedImagePublicIds:
        parsedRemoved !== undefined ? parsedRemoved : removedImagePublicIds,
      stock,
      sizes: sizes !== undefined ? (Array.isArray(parsedSizes) ? parsedSizes : []) : undefined,
    });
    if (!updated) {
      return response.errorResponse(
        res,
        [{ msg: "Product variant not found." }],
        "Product variant not found.",
        404,
      );
    }

    return response.successResponse(
      res,
      updated,
      "Product variant updated successfully.",
    );
  } catch (err) {
    console.error("Error updating product variant:", err);
    const dupErrors = validationErrorsFromDuplicateKey(err);
    if (dupErrors) {
      return response.errorResponse(res, dupErrors, "Validation Error", 400);
    }
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const bulkCreateProductVariants = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { productId, variants } = req.body;
    const result = await productVariantService.bulkCreateProductVariants(productId, variants);
    if (result?.validationError) {
      return response.errorResponse(res, result.validationError, "Validation Error", 400);
    }

    return response.successResponse(res, result.data, result.message);
  } catch (err) {
    console.error("Error bulk creating product variants:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const uploadVariantImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      return response.errorResponse(
        res,
        [{ path: "image", msg: "Image file is required." }],
        "Validation Error",
        400,
      );
    }
    const uploaded = await productVariantService.uploadVariantImageFile(file);
    return response.successResponse(res, uploaded, "Image uploaded.");
  } catch (err) {
    console.error("Error uploading variant image:", err);
    return response.errorResponse(res, {}, err.message || "Upload failed.", 500);
  }
};

const uploadVariantImages = async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      return response.errorResponse(
        res,
        [{ path: "images", msg: "At least one image file is required." }],
        "Validation Error",
        400,
      );
    }
    const uploaded = await productVariantService.uploadVariantImageFiles(files);
    return response.successResponse(res, uploaded, "Images uploaded.");
  } catch (err) {
    console.error("Error uploading variant images:", err);
    return response.errorResponse(res, {}, err.message || "Upload failed.", 500);
  }
};

const deleteVariantImage = async (req, res) => {
  try {
    const variantId = String(req.body?.variantId || "").trim();
    const publicId = String(req.body?.publicId || "").trim();
    const parsedPublicIds = parseJsonField(req.body?.publicIds, req.body?.publicIds);
    const publicIds = Array.isArray(parsedPublicIds) ? parsedPublicIds : [];

    if (!publicId && publicIds.length === 0) {
      return response.errorResponse(
        res,
        [{ path: "publicId", msg: "publicId or publicIds is required." }],
        "Validation Error",
        400,
      );
    }
    const result =
      publicIds.length > 0
        ? await productVariantService.deleteVariantImages({ variantId, publicIds })
        : await productVariantService.deleteVariantImage({ variantId, publicId });
    if (
      (Array.isArray(result?.deleted) && result.deleted.length === 0) ||
      result?.deleted === false
    ) {
      return response.errorResponse(
        res,
        [{ path: "publicId", msg: "Invalid or unsupported publicId." }],
        "Validation Error",
        400,
      );
    }
    return response.successResponse(res, result, "Variant image deleted.");
  } catch (err) {
    console.error("Error deleting variant image:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const deleteProductVariant = async (req, res) => {
  try {
    const { product_variant_id: variantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return response.errorResponse(
        res,
        [{ path: "product_variant_id", msg: "Invalid product variant id." }],
        "Validation Error",
        400,
      );
    }

    const deleted = await productVariantService.deleteProductVariant(variantId);
    if (!deleted) {
      return response.errorResponse(
        res,
        [{ msg: "Product variant not found." }],
        "Product variant not found.",
        404,
      );
    }

    return response.successResponse(res, {}, "Product variant deleted successfully.");
  } catch (err) {
    console.error("Error deleting product variant:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  getProductVariantsList,
  getProductVariantsOverview,
  getProductVariantById,
  getVariantsByProductId,
  bulkCreateProductVariants,
  uploadVariantImage,
  uploadVariantImages,
  deleteVariantImage,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
};
