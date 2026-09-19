/**
 * Input Validation Middleware
 *
 * This middleware validates and sanitizes user inputs before they reach controllers
 */

const {
  validateEmail,
  validatePhone,
  sanitizeRequestBody,
  containsDangerousPatterns,
  containsDangerousPatternsForSocialUrl,
  validateAndNormalizeListFilters,
} = require("./validationHelpers");
const { sanitizeValidationError } = require("../utils/errorSanitizer");

/**
 * Middleware to sanitize request body
 */
const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeRequestBody(req.body);
  }

  if (req.query && typeof req.query === "object") {
    req.query = sanitizeRequestBody(req.query);
  }

  if (req.params && typeof req.params === "object") {
    req.params = sanitizeRequestBody(req.params);
  }

  next();
};

/**
 * Validate email field
 */
const validateEmailField = (fieldName = "email") => {
  return (req, res, next) => {
    if (
      req.body[fieldName] !== undefined &&
      req.body[fieldName] !== null &&
      req.body[fieldName] !== ""
    ) {
      const result = validateEmail(req.body[fieldName]);
      if (!result.valid) {
        return res.status(400).json({
          errors: [
            { path: fieldName, msg: sanitizeValidationError(result.error) },
          ],
          message: "Validation error",
        });
      }
      req.body[fieldName] = result.sanitized;
    }
    next();
  };
};

/**
 * Validate phone field
 */
const validatePhoneField = (fieldName = "phone") => {
  return (req, res, next) => {
    if (
      req.body[fieldName] !== undefined &&
      req.body[fieldName] !== null &&
      req.body[fieldName] !== ""
    ) {
      const result = validatePhone(req.body[fieldName]);
      if (!result.valid) {
        return res.status(400).json({
          errors: [
            { path: fieldName, msg: sanitizeValidationError(result.error) },
          ],
          message: "Validation error",
        });
      }
      req.body[fieldName] = result.sanitized;
    }
    next();
  };
};

/**
 * Check for dangerous patterns in request body.
 * Uses relaxed URL-aware check for socialMedia.*, embedUrl, and known URL/storage fields
 * (url, publicId — e.g. product/variant images, R2 keys) because strict SQL-style rules
 * flag "/" in https://... and paths like product-variants/uuid.png as false positives.
 */
const checkDangerousPatterns = (req, res, next) => {
  const enumSafeValuesByKey = {
    inputType: new Set(["text", "number", "select", "boolean"]),
  };

  /** Plain object keys whose string values may be URLs or CDN/storage paths */
  const relaxedUrlLikeKeys = new Set([
    "url",
    "key",
    "trackingUrl",
    "publicId",
    "removedImagePublicIds",
    "publicIds",
  ]);

  /**
   * Free-text fields that humans author (product copy, size hover text, etc.) — the
   * strict SQL block-list trips on common punctuation like `|`, `&`, `%`, `+`, `*`
   * that legitimately appears in measurements or marketing copy. We still block
   * XSS (tags / `javascript:` protocols) and Mongo operators via the relaxed checker.
   */
  const relaxedFreeTextKeys = new Set([
    "label",
    "description",
    "shortDescription",
    "longDescription",
    "metaDescription",
    "deliveryDescription",
    "purchaseNote",
    "message",
    "introLine",
    "formHeading",
    "pageTitle",
    "body",
    "note",
    "reason",
    "termsAndConditions",
  ]);

  const checkValue = (
    value,
    isSocialMediaContext = false,
    currentKey = "",
    isRelaxedContext = false,
  ) => {
    if (typeof value === "string") {
      const safeEnumSet = enumSafeValuesByKey[currentKey];
      if (safeEnumSet && safeEnumSet.has(String(value).trim().toLowerCase())) {
        return false;
      }

      const useRelaxedUrlCheck =
        isSocialMediaContext ||
        isRelaxedContext ||
        relaxedUrlLikeKeys.has(currentKey) ||
        relaxedFreeTextKeys.has(currentKey);

      const isDangerous = useRelaxedUrlCheck
        ? containsDangerousPatternsForSocialUrl(value)
        : containsDangerousPatterns(value);
      if (isDangerous) {
        return true;
      }
    } else if (typeof value === "object" && value !== null) {
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          if (containsDangerousPatterns(key)) {
            return true;
          }
          const nextIsSocial =
            isSocialMediaContext ||
            (value === req.body && key === "socialMedia") ||
            key === "embedUrl";
          const nextIsRelaxed =
            isRelaxedContext || relaxedUrlLikeKeys.has(currentKey);
          if (checkValue(value[key], nextIsSocial, key, nextIsRelaxed)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  if (req.body && checkValue(req.body)) {
    return res.status(400).json({
      errors: [{ msg: "Input contains potentially dangerous patterns" }],
      message: "Invalid input detected",
    });
  }

  // Query params: skip dangerous-pattern check for structured API params that
  // contain our filter format (query=JSON with date "from|to", filters=comma list)
  const skipQueryKeys = new Set(["query", "filters"]);
  if (req.query && typeof req.query === "object") {
    for (const key in req.query) {
      if (!Object.prototype.hasOwnProperty.call(req.query, key)) continue;
      if (containsDangerousPatterns(key)) {
        return res.status(400).json({
          errors: [
            { msg: "Query parameters contain potentially dangerous patterns" },
          ],
          message: "Invalid input detected",
        });
      }
      if (skipQueryKeys.has(key)) continue;
      if (checkValue(req.query[key])) {
        return res.status(400).json({
          errors: [
            { msg: "Query parameters contain potentially dangerous patterns" },
          ],
          message: "Invalid input detected",
        });
      }
    }
  }

  next();
};

module.exports = {
  sanitizeInput,
  validateEmailField,
  validatePhoneField,
  checkDangerousPatterns,
  validateEmail,
  validatePhone,
  validateAndNormalizeListFilters,
};
