/**
 * Error Sanitization Utility
 *
 * Sanitizes error messages before sending them to clients to prevent
 * information leakage while maintaining user-friendly error messages.
 *
 * Detailed errors are still logged server-side via console.error.
 */

/**
 * Sanitize validation error messages
 * @param {string} message - Original validation error message
 * @returns {string} - Sanitized error message
 */
const sanitizeValidationError = (message) => {
  // Remove field names and internal details
  const lowerMessage = message.toLowerCase();

  // Common patterns to sanitize
  if (
    lowerMessage.includes("already exists") ||
    lowerMessage.includes("duplicate")
  ) {
    return "Duplicate field error";
  }
  if (lowerMessage.includes("not found")) {
    return "Resource not found";
  }
  if (lowerMessage.includes("invalid") && lowerMessage.includes("format")) {
    return "Invalid input format";
  }
  if (lowerMessage.includes("required")) {
    return "Required field missing";
  }
  if (lowerMessage.includes("length")) {
    return "Input length invalid";
  }

  // Generic validation error if no pattern matches
  return "Validation error";
};

const { PASSWORD_MIN_LENGTH } = require("../constants/passwordPolicy");

/**
 * Convert Mongoose ValidationError to user-friendly errors with field path
 * @param {Error} error - Mongoose ValidationError
 * @returns {Array} - Array of { path, msg } for API response
 */
const formatMongooseValidationErrors = (error) => {
  if (!error || error.name !== "ValidationError" || !error.errors) {
    return [];
  }
  const fieldMessages = {
    name: {
      minlength: "Name must be at least 3 characters",
      maxlength: "Name is too long",
      required: "Name is required",
    },
    phone: {
      required: "Phone number is required",
    },
    password: {
      minlength: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      required: "Password is required",
    },
    email: {
      required: "Email is required",
    },
  };
  return Object.values(error.errors).map((e) => {
    const fieldConfig = fieldMessages[e.path];
    let msg =
      fieldConfig?.[e.kind] ||
      (e.kind === "minlength" && e.properties?.min
        ? `${String(e.path).charAt(0).toUpperCase() + String(e.path).slice(1)} must be at least ${e.properties.min} characters`
        : null);
    if (!msg) {
      msg =
        e.kind === "required"
          ? `${String(e.path).charAt(0).toUpperCase() + String(e.path).slice(1)} is required`
          : "Please check your input";
    }
    return { path: e.path, msg };
  });
};

/**
 * Sanitize authentication error messages
 * @param {string} message - Original auth error message
 * @returns {string} - Sanitized error message
 */
const sanitizeAuthError = (message) => {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("invalid") &&
    (lowerMessage.includes("credential") || lowerMessage.includes("password"))
  ) {
    return "Invalid credentials";
  }
  if (lowerMessage.includes("expired") || lowerMessage.includes("token")) {
    return "Session expired. Please login again.";
  }
  if (lowerMessage.includes("not found")) {
    return "Invalid credentials";
  }
  if (lowerMessage.includes("blocked") || lowerMessage.includes("inactive")) {
    return "Account access denied. Please contact support.";
  }

  return "Authentication failed";
};

/**
 * Sanitize resource not found errors
 * @param {string} resourceType - Type of resource (User, Admin, etc.)
 * @returns {string} - Sanitized error message
 */
const sanitizeNotFoundError = (resourceType) => {
  // Don't expose resource type details
  return "Resource not found";
};

/**
 * Sanitize database error messages (MongoDB errors)
 * @param {Error} error - Database error object
 * @returns {string} - Sanitized error message
 */
const sanitizeDatabaseError = (error) => {
  // Log full error server-side
  console.error("Database error details:", error);

  if (error.code === 11000) {
    // Duplicate key error - don't expose field name
    return "Duplicate field error";
  }
  if (error.name === "ValidationError") {
    return "Validation error";
  }
  if (error.kind === "ObjectId") {
    return "Invalid resource identifier";
  }

  return "Database operation failed";
};

/**
 * Sanitize generic error messages
 * @param {string} message - Original error message
 * @returns {string} - Sanitized error message
 */
const sanitizeGenericError = (message) => {
  if (!message) {
    return "An error occurred";
  }

  const lowerMessage = message.toLowerCase();

  // Remove specific identifiers and internal details (generic, no project-specific strings)
  if (lowerMessage.includes("user") && lowerMessage.includes("not found")) {
    return "Invalid credentials";
  }
  if (lowerMessage.includes("phone number")) {
    return "Invalid input";
  }
  if (lowerMessage.includes("email")) {
    return "Invalid input";
  }
  if (lowerMessage.includes("maximum number")) {
    return "This phone number has reached its account limit. Please use a different phone number or login to your existing account.";
  }

  // For unknown errors, return generic message
  // Full error is logged server-side
  return "An error occurred";
};

/**
 * Main sanitization function - determines error type and sanitizes accordingly
 * @param {Error|string} error - Error object or error message
 * @param {string} context - Error context (auth, validation, database, etc.)
 * @returns {string} - Sanitized error message
 */
const sanitizeError = (error, context = "generic") => {
  // If error is a string, use it directly
  if (typeof error === "string") {
    switch (context) {
      case "auth":
        return sanitizeAuthError(error);
      case "validation":
        return sanitizeValidationError(error);
      case "notFound":
        return sanitizeNotFoundError(error);
      default:
        return sanitizeGenericError(error);
    }
  }

  // If error is an Error object
  if (error instanceof Error) {
    if (error.code === 11000 || error.name === "MongoServerError") {
      return sanitizeDatabaseError(error);
    }
    if (error.name === "ValidationError") {
      return sanitizeValidationError(error.message);
    }

    return sanitizeGenericError(error.message);
  }

  return "An error occurred";
};

/**
 * Sanitize error response for duplicate key errors
 * @param {Error} error - MongoDB duplicate key error
 * @param {string} defaultField - Default field path if cannot be determined
 * @returns {Object} - Sanitized error object with path and msg
 */
const sanitizeDuplicateKeyError = (error, defaultField = "field") => {
  // Log detailed error server-side
  console.error("Duplicate key error details:", {
    code: error.code,
    keyPattern: error.keyPattern,
    keyValue: error.keyValue,
  });

  // Don't expose which field is duplicated
  const field = Object.keys(error.keyPattern || {})[0] || defaultField;

  return {
    path: field, // Keep path for form field mapping, but sanitize message
    msg: "Duplicate field error",
  };
};

/**
 * Sanitize validation error array from express-validator
 * @param {Array} errors - Array of validation errors
 * @returns {Array} - Sanitized error array
 */
const sanitizeValidationErrors = (errors) => {
  if (!Array.isArray(errors)) {
    return errors;
  }

  return errors.map((error) => {
    if (typeof error === "object" && error.msg) {
      return {
        ...error,
        msg: sanitizeValidationError(error.msg),
      };
    }
    return error;
  });
};

module.exports = {
  sanitizeError,
  sanitizeValidationError,
  sanitizeAuthError,
  sanitizeDuplicateKeyError,
  sanitizeValidationErrors,
  formatMongooseValidationErrors,
};
