/**
 * CORS Loader Module
 * 
 * Loads and applies CORS middleware to the Express application.
 * CORS configuration is loaded from config/corsConfig.js.
 */

const cors = require("cors");
const { getCorsOptions } = require("../../config/corsConfig");

/**
 * Load CORS middleware
 * @param {Express} app - Express application instance
 */
const loadCors = (app) => {
  const corsOptions = getCorsOptions();
  app.use(cors(corsOptions));
  console.log("✅ CORS middleware loaded");
};

module.exports = {
  loadCors,
};
