/**
 * CORS Configuration Module
 *
 * Configures Cross-Origin Resource Sharing (CORS) middleware with strict
 * origin validation. Allows requests without origin header for server-to-server
 * calls and testing tools, but requires explicit whitelisting for browser requests.
 *
 * SECURITY: Only explicitly whitelisted domains can make browser-based requests.
 */

const { ALLOWED_ORIGINS } = require("./config");

/**
 * Get CORS configuration options
 * @returns {Object} CORS configuration object
 */
const getCorsOptions = () => {
  return {
    origin: (origin, callback) => {
      // Allow requests without origin header (Postman, curl, internal APIs, localhost)
      // These are typically server-to-server calls or testing tools that don't send Origin
      if (!origin) {
        return callback(null, true);
      }

      // Parse allowed origins from environment variable
      const origins =
        ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()) || [];

      // SECURITY: If no origins configured, deny all browser-based cross-origin requests
      // This ensures only explicitly whitelisted domains can make browser requests
      if (origins.length === 0) {
        return callback(new Error("CORS: No allowed origins configured"));
      }

      // SECURITY: Strictly validate browser requests with origin header
      // Only allow requests from explicitly whitelisted frontend domains
      if (origins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        // Do not throw here; some setups surface this as an unhandled error.
        // Returning `false` makes CORS simply reject the request.
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "x-session-id",
    ],
    exposedHeaders: [],
  };
};

module.exports = {
  getCorsOptions,
};
