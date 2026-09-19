/**
 * Routes Loader Module
 * 
 * Loads and registers all application routes.
 */

const loadRoutes = (app) => {
  const adminModule = require("../../modules/admin");
  const userModule = require("../../modules/user");
  const commonModule = require("../../modules/common");
  const storeModule = require("../../modules/store");
  const commerceModule = require("../../modules/commerce");

  app.use("/api", adminModule.routes);
  app.use("/api", userModule.routes);
  app.use("/api", commerceModule.routes);
  app.use("/api/common", commonModule.routes);
  app.use("/api/store", storeModule.routes);

  console.log("✅ Routes loaded");
};

module.exports = {
  loadRoutes,
};
