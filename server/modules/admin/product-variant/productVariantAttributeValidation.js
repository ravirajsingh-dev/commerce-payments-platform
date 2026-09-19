const Product = require("../../../models/Product");
const Attribute = require("../../../models/Attribute");
const {
  normalizeAttributesObject,
  normalizeSizes,
  isSizeCode,
} = require("./productVariantHelpers");

const normKey = (code) => String(code || "").trim().toLowerCase();

const optionValueSet = (def) => {
  const set = new Set();
  (def?.options || []).forEach((opt) => {
    const v = String(opt?.value ?? "").trim();
    if (v) set.add(v);
  });
  return set;
};

const valueMatchesAllowedOption = (rawValue, allowedSet) => {
  const val = String(rawValue ?? "").trim();
  if (!val) return true;
  if (allowedSet.has(val)) return true;
  const lower = val.toLowerCase();
  for (const allowed of allowedSet) {
    if (String(allowed).trim().toLowerCase() === lower) return true;
  }
  return false;
};

/**
 * Validates variant `attributes` / `sizes` against the product's attribute set.
 * Returns `{ validationError: [{ path, msg }] }` or `null` when valid.
 */
const validateVariantPayloadForProduct = async (
  productId,
  rawAttributes = {},
  rawSizes,
) => {
  if (!productId) {
    return {
      validationError: [{ path: "productId", msg: "Product id is required." }],
    };
  }

  const product = await Product.findById(productId).select("attributeSetId").lean();
  if (!product) {
    return {
      validationError: [{ path: "productId", msg: "Product not found." }],
    };
  }

  const setId = product.attributeSetId;
  const defs = await Attribute.find({ attributeSetId: setId }).lean();
  const variantSelectDefs = defs.filter(
    (row) => row.isVariant === true && row.inputType === "select",
  );

  const variantAxisCodes = new Set(
    variantSelectDefs.map((d) => normKey(d.code)).filter(Boolean),
  );
  const sizeDef = variantSelectDefs.find((d) => isSizeCode(d.code)) || null;

  const errors = [];
  const normalizedAttrs = normalizeAttributesObject(rawAttributes);

  Object.keys(normalizedAttrs).forEach((key) => {
    const nk = normKey(key);
    if (!variantAxisCodes.has(nk)) {
      errors.push({
        path: `attributes.${key}`,
        msg: `"${key}" is not a variant attribute for this product's attribute set.`,
      });
    }
  });

  variantSelectDefs.forEach((def) => {
    const code = normKey(def.code);
    if (isSizeCode(code)) return;
    const val = String(normalizedAttrs[code] ?? "").trim();
    if (def.isRequired && !val) {
      errors.push({
        path: `attributes.${code}`,
        msg: `${def.name || code} is required.`,
      });
      return;
    }
    if (!val) return;
    const allowed = optionValueSet(def);
    if (!valueMatchesAllowedOption(val, allowed)) {
      errors.push({
        path: `attributes.${code}`,
        msg: `${def.name || code}: "${val}" is not a valid option.`,
      });
    }
  });

  const sizes = rawSizes === undefined ? [] : normalizeSizes(rawSizes);

  if (sizeDef) {
    if (!Array.isArray(sizes) || sizes.length === 0) {
      if (sizeDef.isRequired) {
        errors.push({
          path: "sizes",
          msg: "Please select at least one size.",
        });
      }
    } else {
      const allowedSizes = optionValueSet({
        ...sizeDef,
        options: (sizeDef.options || []).map((o) => ({
          ...o,
          value: String(o?.value ?? "").trim().toLowerCase(),
        })),
      });
      sizes.forEach((row) => {
        const v = String(row?.value ?? "").trim().toLowerCase();
        if (!v) return;
        if (!allowedSizes.has(v)) {
          errors.push({
            path: "sizes",
            msg: `Size "${row.label || v}" is not a valid option for this product.`,
          });
        }
      });
    }
  } else if (Array.isArray(sizes) && sizes.length > 0) {
    errors.push({
      path: "sizes",
      msg: "This product's attribute set does not define a size axis.",
    });
  }

  if (errors.length > 0) return { validationError: errors };
  return null;
};

module.exports = {
  validateVariantPayloadForProduct,
};
