const express = require("express");
const http = require("http");
const { APP_API_PORT } = require("./config/config");

// Loaders (migrated to bootstrap/loaders)
const { loadCors } = require("./bootstrap/loaders/corsLoader");
const { loadHelmet } = require("./bootstrap/loaders/helmetLoader");
const { loadRateLimiters } = require("./bootstrap/loaders/rateLimiterLoader");
const { loadMiddleware } = require("./bootstrap/loaders/middlewareLoader");
const { loadRoutes } = require("./bootstrap/loaders/routesLoader");
const {
  loadErrorHandlers,
} = require("./bootstrap/loaders/errorHandlersLoader");
const { loadDatabase } = require("./bootstrap/loaders/dbLoader");
const { loadEmailService } = require("./bootstrap/loaders/emailServiceLoader");

// Initialize Express application
const app = express();
const server = http.createServer(app);

/**
 * Initialize server
 * Loads all components in the correct order (matching original server.js order)
 */
const initializeServer = async () => {
  try {
    // 1. Load CORS middleware (must be first to handle preflight requests)
    loadCors(app);

    // 2. Load cookie parser (needed early for session handling)
    const cookieParser = require("cookie-parser");
    app.use(cookieParser());

    // 3. Load Helmet security headers
    loadHelmet(app);

    // 4. Load remaining middleware (body parser, morgan, sanitization, session expiry)
    loadMiddleware(app);

    // 5. Load rate limiters (applied to specific route groups)
    loadRateLimiters(app);

    // 6. Initialize database connection
    await loadDatabase();

    // 7. Verify email service connection (non-blocking)
    await loadEmailService();

    // 8. Load application routes
    loadRoutes(app);

    // 9. Load error handlers (must be last)
    loadErrorHandlers(app);

    // Start server
    const port = APP_API_PORT || 5000;
    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server listening on port ${port}`);
    });
  } catch (error) {
    console.error("❌ Server initialization failed:", error);
    process.exit(1);
  }
};

// Initialize and start the server
initializeServer();

module.exports = { app, server };
