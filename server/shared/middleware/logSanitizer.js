/**
 * Log Sanitizer Utility
 *
 * Sanitizes request bodies and objects for logging by masking sensitive fields.
 * This prevents sensitive data like passwords, tokens, and payment information
 * from appearing in logs.
 *
 * SECURITY: Never log raw request bodies without sanitization.
 */

/**
 * List of sensitive fields that should be masked in logs
 */
const SENSITIVE_FIELDS = [
  "password",
  "oldPassword",
  "txn_password",
  "confirmPassword",
  "token",
  "refreshToken",
  "sessionID",
  "utrNumber",
  "upiId",
];

/**
 * Masks sensitive fields in an object recursively
 * Replaces sensitive field values with "***" instead of removing them
 *
 * @param {Object} body - The request body or object to sanitize
 * @returns {Object} - A deep clone of body with sensitive fields masked
 *
 * @example
 * sanitizeLogBody({ password: "12345", username: "john" })
 * // Returns: { password: "***", username: "john" }
 */
const sanitizeLogBody = (body) => {
  // Handle null, undefined, or non-object types
  if (!body || typeof body !== "object") {
    return body;
  }

  // Handle arrays
  if (Array.isArray(body)) {
    return body.map((item) => sanitizeLogBody(item));
  }

  // Deep clone the body to avoid mutating the original
  // Use JSON serialization for deep cloning
  let sanitized;
  try {
    sanitized = JSON.parse(JSON.stringify(body));
  } catch (error) {
    // If JSON serialization fails, return the original body
    // This can happen with circular references or special objects
    return body;
  }

  // Recursively mask sensitive fields
  const maskSensitiveFields = (obj) => {
    if (obj === null || typeof obj !== "object") {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item) => maskSensitiveFields(item));
    } else {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          // Check if the key matches any sensitive field (case-insensitive)
          const isSensitive = SENSITIVE_FIELDS.some(
            (field) => field.toLowerCase() === key.toLowerCase(),
          );

          if (isSensitive) {
            // Mask the sensitive field value
            obj[key] = "***";
          } else if (typeof obj[key] === "object") {
            // Recursively sanitize nested objects
            maskSensitiveFields(obj[key]);
          }
        }
      }
    }
  };

  maskSensitiveFields(sanitized);
  return sanitized;
};

module.exports = {
  sanitizeLogBody,
};
