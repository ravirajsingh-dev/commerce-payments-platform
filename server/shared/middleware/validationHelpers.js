/**
 * Input Validation and Sanitization Utility
 *
 * This module provides comprehensive validation and sanitization functions
 * to prevent injection attacks, XSS, and ensure data integrity.
 */

/**
 * Sanitize string input to prevent XSS and injection attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeString = (input) => {
  if (typeof input !== "string") {
    return String(input);
  }

  // Remove HTML/script tags
  let sanitized = input.replace(/<[^>]*>/g, "");

  // Remove MongoDB operators
  sanitized = sanitized.replace(/\$[a-zA-Z]+/g, "");

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
};

/**
 * Validate and sanitize email address
 * @param {string} email - Email to validate
 * @returns {object} - { valid: boolean, sanitized: string, error: string }
 */
const validateEmail = (email) => {
  if (!email || typeof email !== "string") {
    return { valid: false, sanitized: "", error: "Email is required" };
  }

  const sanitized = sanitizeString(email).toLowerCase();

  // Strict email regex
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(sanitized)) {
    return { valid: false, sanitized: "", error: "Invalid email format" };
  }

  if (sanitized.length > 254) {
    return {
      valid: false,
      sanitized: "",
      error: "Email is too long (max 254 characters)",
    };
  }

  const parts = sanitized.split("@");
  if (parts[0].length > 64) {
    return {
      valid: false,
      sanitized: "",
      error: "Email local part is too long",
    };
  }

  return { valid: true, sanitized, error: null };
};

/**
 * Validate and sanitize phone number (10 digits only)
 * @param {string|number} phone - Phone number to validate
 * @returns {object} - { valid: boolean, sanitized: string, error: string }
 */
const validatePhone = (phone) => {
  if (!phone) {
    return { valid: false, sanitized: "", error: "Phone number is required" };
  }

  // Convert to string and remove all non-digit characters
  const phoneStr = String(phone).replace(/\D/g, "");

  // Must be exactly 10 digits
  if (!/^[0-9]{10}$/.test(phoneStr)) {
    return {
      valid: false,
      sanitized: "",
      error: "Phone number must be exactly 10 digits",
    };
  }

  return { valid: true, sanitized: phoneStr, error: null };
};

const normalizeSchemaType = (schemaType) => {
  switch (schemaType) {
    case "String":
      return "String";
    case "Number":
      return "Number";
    case "Date":
      return "Date";
    case "Boolean":
      return "Boolean";
    case "ObjectId":
      return "id";
    default:
      return null;
  }
};

const parseDateRange = (value) => {
  const range = String(value || "").trim();
  if (!range) {
    return { valid: false, error: "Date range is required" };
  }

  const parts = range.includes("|") ? range.split("|") : range.split(" - ");
  const startRaw = (parts[0] || "").trim();
  const endRaw = (parts[1] || "").trim();
  if (!startRaw || !endRaw) {
    return {
      valid: false,
      error: "Date range must include start and end date",
    };
  }

  const start = new Date(
    !startRaw.includes(":") && !startRaw.includes("T")
      ? `${startRaw}T00:00:00.000Z`
      : startRaw,
  );
  const end = new Date(
    !endRaw.includes(":") && !endRaw.includes("T")
      ? `${endRaw}T23:59:59.999Z`
      : endRaw,
  );

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: "Invalid date range format" };
  }
  if (start > end) {
    return { valid: false, error: "From date cannot be greater than to date" };
  }

  return { valid: true, sanitized: `${startRaw}|${endRaw}` };
};

const validateAndNormalizeListFilters = ({
  filters,
  query,
  schema,
  allowedFields = [],
  fieldTypeMap = {},
  customValidators = {},
}) => {
  const normalizedFilters = Array.isArray(filters)
    ? [...new Set(filters.map((f) => String(f || "").trim()).filter(Boolean))]
    : [];
  const normalizedQuery = {};
  const errors = [];
  const allowed = new Set(allowedFields);

  normalizedFilters.forEach((field) => {
    if (!allowed.has(field)) {
      errors.push({ path: field, msg: "Unsupported filter field." });
      return;
    }

    const filterQuery = query?.[field];
    if (!filterQuery || typeof filterQuery !== "object") return;

    const schemaType = schema?.path(field)?.instance;
    const expectedType = fieldTypeMap[field] || normalizeSchemaType(schemaType);
    const incomingType = String(filterQuery.type || "").trim();

    if (!expectedType) {
      errors.push({ path: field, msg: "Invalid filter configuration." });
      return;
    }
    if (incomingType !== expectedType) {
      errors.push({
        path: field,
        msg: `Invalid filter type for ${field}. Expected ${expectedType}.`,
      });
      return;
    }

    const rawValue = filterQuery.value;
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return;
    }

    let sanitizedValue = rawValue;
    if (expectedType === "String") {
      sanitizedValue = sanitizeString(String(rawValue));
    } else if (expectedType === "Number") {
      const parsed = Number(rawValue);
      if (Number.isNaN(parsed)) {
        errors.push({ path: field, msg: `${field} must be a valid number.` });
        return;
      }
      sanitizedValue = parsed;
    } else if (expectedType === "Date") {
      const dateCheck = parseDateRange(rawValue);
      if (!dateCheck.valid) {
        errors.push({ path: field, msg: dateCheck.error });
        return;
      }
      sanitizedValue = dateCheck.sanitized;
    } else if (expectedType === "Boolean") {
      sanitizedValue =
        rawValue === true || rawValue === "true" || rawValue === "1";
    } else if (expectedType === "id") {
      sanitizedValue = String(rawValue).trim();
    }

    if (typeof customValidators[field] === "function") {
      const result = customValidators[field](sanitizedValue);
      if (!result?.valid) {
        errors.push({
          path: field,
          msg: result?.error || "Invalid filter value.",
        });
        return;
      }
      sanitizedValue = result.sanitized;
    }

    normalizedQuery[field] = {
      value: sanitizedValue,
      type: expectedType,
    };
  });

  return {
    valid: errors.length === 0,
    errors,
    filters: normalizedFilters,
    query: normalizedQuery,
  };
};

/**
 * Sanitize object to prevent MongoDB injection
 * Recursively sanitizes all string values in an object
 * @param {object} obj - Object to sanitize
 * @returns {object} - Sanitized object
 */
const sanitizeObject = (obj) => {
  // Return non-objects and null as-is to prevent errors
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized = {};
  for (const key in obj) {
    // Use Object.prototype.hasOwnProperty.call for safety (works even if obj has no prototype)
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Sanitize key
      const sanitizedKey = sanitizeString(key);

      // Skip MongoDB operators in keys
      if (sanitizedKey.startsWith("$")) {
        continue;
      }

      const value = obj[key];

      if (typeof value === "string") {
        sanitized[sanitizedKey] = sanitizeString(value);
      } else if (typeof value === "object" && value !== null) {
        sanitized[sanitizedKey] = sanitizeObject(value);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }
  }

  return sanitized;
};

/**
 * Check if string contains dangerous patterns
 * @param {string} input - Input to check
 * @returns {boolean} - True if dangerous patterns found
 */
const containsDangerousPatterns = (input) => {
  if (typeof input !== "string") {
    return false;
  }

  // Check for HTML/script tags
  if (/<[^>]*>/g.test(input)) {
    return true;
  }

  // Check for MongoDB operators
  if (/\$[a-zA-Z]+/.test(input)) {
    return true;
  }

  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /[';\\\/\*\+\|\&\%]/,
    /--/,
    /\/\*/,
    /\*\//,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      return true;
    }
  }

  return false;
};

/**
 * Check if string contains dangerous patterns when used as a social media URL.
 * Relaxes SQL-style character checks (e.g. / : & %) that cause false positives
 * for valid URLs, while still blocking XSS (html/script, javascript:, data:, etc.)
 * and MongoDB operators. Use only for req.body.socialMedia.* values.
 *
 * @param {string} input - Input to check (URL or URL-like string)
 * @returns {boolean} - True if dangerous patterns found
 */
const containsDangerousPatternsForSocialUrl = (input) => {
  if (typeof input !== "string") {
    return false;
  }
  // Block HTML/script tags (XSS)
  if (/<[^>]*>/g.test(input)) {
    return true;
  }
  // Block MongoDB operators
  if (/\$[a-zA-Z]+/.test(input)) {
    return true;
  }
  // Block dangerous protocols (XSS)
  if (/\b(javascript|data|vbscript):/i.test(input.trim())) {
    return true;
  }
  return false;
};

/**
 * Sanitize request body to prevent injection attacks
 * @param {object} body - Request body to sanitize
 * @returns {object} - Sanitized request body
 */
const sanitizeRequestBody = (body) => {
  if (!body || typeof body !== "object") {
    return body;
  }

  return sanitizeObject(body);
};

module.exports = {
  validateEmail,
  validatePhone,
  validateAndNormalizeListFilters,
  sanitizeRequestBody,
  containsDangerousPatterns,
  containsDangerousPatternsForSocialUrl,
};
