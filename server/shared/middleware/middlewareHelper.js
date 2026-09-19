const excludeRoutes = (middleware, excludedPaths) => {
  return (req, res, next) => {
    if (excludedPaths.some((path) => req.path.startsWith(path))) {
      return next();
    } else {
      return middleware(req, res, next);
    }
  };
};

module.exports = { excludeRoutes };
