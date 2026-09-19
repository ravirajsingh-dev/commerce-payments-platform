const mongoose = require("mongoose");

const ProductVariant = require("../../../models/ProductVariant");
const Inventory = require("../../../models/Inventory");
const {
  validateVariantPayloadForProduct,
} = require("./productVariantAttributeValidation");
const {
  MAX_BULK_VARIANTS,
  normalizeAttributesObject,
  normalizeSku,
  normalizeVariantName,
  normalizeShortDescription,
  normalizeVariantImages,
  normalizeStock,
  normalizeSizes,
  normalizeIsNewArrival,
  normalizeVariantDiscountFields,
  variantDocToPlain,
} = require("./productVariantHelpers");

const upsertInventoryForVariant = async (productVariantId, stock = 0) =>
  Inventory.findOneAndUpdate(
    { productVariantId },
    { $set: { stock: normalizeStock(stock, 0) } },
    { upsert: true, returnDocument: "after", runValidators: true },
  ).lean();

const validateBulkInputs = (productId, variants) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return { validationError: [{ path: "productId", msg: "Invalid product id." }] };
  }
  if (!Array.isArray(variants) || variants.length === 0) {
    return {
      validationError: [
        { path: "variants", msg: "At least one variant is required." },
      ],
    };
  }
  if (variants.length > MAX_BULK_VARIANTS) {
    return {
      validationError: [
        {
          path: "variants",
          msg: `Maximum ${MAX_BULK_VARIANTS} variants per request.`,
        },
      ],
    };
  }
  return null;
};

const normalizeBulkVariants = (productId, variants) => {
  const normalizedDocs = [];
  const skusInBatch = new Set();

  for (let i = 0; i < variants.length; i += 1) {
    const v = variants[i] || {};
    const sku = normalizeSku(v.sku);
    const attrs = normalizeAttributesObject(v.attributes);
    if (!sku || Object.keys(attrs).length === 0) {
      return {
        validationError: [
          {
            path: `variants[${i}]`,
            msg: "Each variant requires a SKU and non-empty attributes.",
          },
        ],
      };
    }

    const fp =
      typeof ProductVariant.computeAttributeFingerprint === "function"
        ? ProductVariant.computeAttributeFingerprint(attrs)
        : "";
    if (!fp) {
      return {
        validationError: [
          { path: `variants[${i}]`, msg: "Could not compute variant fingerprint." },
        ],
      };
    }

    if (skusInBatch.has(sku)) {
      return {
        validationError: [
          { path: `variants[${i}]`, msg: "Duplicate SKU in this batch." },
        ],
      };
    }
    skusInBatch.add(sku);

    const priceNum = Number(v.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return {
        validationError: [
          {
            path: `variants[${i}]`,
            msg: "Each variant needs a valid non-negative price.",
          },
        ],
      };
    }

    const discountFields = normalizeVariantDiscountFields(
      v.discountType,
      v.discountValue,
      priceNum,
    );

    normalizedDocs.push({
      productId,
      sku,
      name: normalizeVariantName(v.name),
      shortDescription: normalizeShortDescription(v.shortDescription),
      attributes: attrs,
      attributeFingerprint: fp,
      price: priceNum,
      discountType: discountFields.discountType,
      discountValue: discountFields.discountValue,
      status: Number(v.status) || 1,
      isNewArrival: normalizeIsNewArrival(v.isNewArrival),
      images: normalizeVariantImages(v.images),
      sizes: normalizeSizes(v.sizes),
      __stock: normalizeStock(v.stock, 0),
    });
  }

  return {
    normalizedDocs,
    skuList: [...skusInBatch],
  };
};

const bulkCreateProductVariants = async (productId, variants = []) => {
  const inputError = validateBulkInputs(productId, variants);
  if (inputError) return inputError;

  const normalized = normalizeBulkVariants(productId, variants);
  if (normalized.validationError) return normalized;
  const { normalizedDocs, skuList } = normalized;

  for (let i = 0; i < normalizedDocs.length; i += 1) {
    const row = normalizedDocs[i];
    const rowValidation = await validateVariantPayloadForProduct(
      productId,
      row.attributes,
      row.sizes,
    );
    if (rowValidation?.validationError) {
      return {
        validationError: rowValidation.validationError.map((err) => ({
          ...err,
          path: err.path ? `variants[${i}].${err.path}` : `variants[${i}]`,
        })),
      };
    }
  }

  const existingSku = await ProductVariant.find({ sku: { $in: skuList } })
    .select("_id sku")
    .lean();

  if (existingSku.length > 0) {
    const sample = existingSku.map((row) => row.sku).join(", ");
    return {
      validationError: [
        { path: "variants", msg: `SKU already in use: ${sample}` },
      ],
    };
  }

  try {
    const inserted = await ProductVariant.insertMany(normalizedDocs);
    // Per-size variants own their stock inline; only legacy (size-less) variants need an Inventory row.
    await Promise.all(
      inserted.map((doc, idx) => {
        const sizes = normalizedDocs[idx].sizes || [];
        if (sizes.length > 0) return Promise.resolve();
        return upsertInventoryForVariant(doc._id, normalizedDocs[idx].__stock);
      }),
    );
    return {
      data: inserted.map((doc, idx) => {
        const sizes = normalizedDocs[idx].sizes || [];
        const totalSizeStock = sizes.reduce(
          (sum, s) => sum + Math.max(0, Number(s?.stock) || 0),
          0,
        );
        return {
          ...variantDocToPlain(doc),
          stock: sizes.length > 0 ? totalSizeStock : normalizedDocs[idx].__stock,
        };
      }),
      message: `Created ${inserted.length} product variants.`,
    };
  } catch (err) {
    console.error("bulkCreateProductVariants:", err);
    if (err?.code === 11000) {
      return {
        validationError: [
          {
            path: "variants",
            msg: "Duplicate SKU (database constraint).",
          },
        ],
      };
    }
    throw err;
  }
};

module.exports = {
  bulkCreateProductVariants,
};
