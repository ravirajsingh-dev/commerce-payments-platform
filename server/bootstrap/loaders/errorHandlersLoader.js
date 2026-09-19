/**
 * Error Handlers Loader Module
 * 
 * Loads and registers error handling middleware in the correct order.
 * Error handlers must be registered after all routes and middleware.
 * 
 * Error handler order (critical):
 * 1. Body size error handler - handles request body size limit exceeded
 * 2. Validation error handler - handles Mongoose validation errors
 * 3. Generic error handler - handles all other unhandled errors
 */

const {
  bodySizeErrorHandler,
  multerErrorHandler,
  validationErrorHandler,
  errorHandler,
} = require("../../shared/middleware/errorHandlers");

/**
 * Load error handling middleware
 * @param {Express} app - Express application instance
 */
const loadErrorHandlers = (app) => {
  // Error handlers (order matters - body size error handler must come first)
  app.use(bodySizeErrorHandler);
  app.use(multerErrorHandler);
  app.use("/", validationErrorHandler);
  app.use("/", errorHandler);

  console.log("✅ Error handlers loaded");
};

module.exports = {
  loadErrorHandlers,
};
