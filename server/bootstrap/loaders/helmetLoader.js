/**
 * Helmet Loader Module
 * 
 * Loads and applies Helmet security headers middleware to the Express application.
 * Helmet configuration is loaded from config/helmetConfig.js.
 */

const helmet = require("helmet");
const { getHelmetOptions } = require("../../config/helmetConfig");

/**
 * Load Helmet security headers middleware
 * @param {Express} app - Express application instance
 */
const loadHelmet = (app) => {
  const helmetOptions = getHelmetOptions();
  app.use(helmet(helmetOptions));
  console.log("✅ Helmet security headers loaded");
};

module.exports = {
  loadHelmet,
};
