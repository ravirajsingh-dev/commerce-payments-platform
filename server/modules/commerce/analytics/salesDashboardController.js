const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const service = require("./salesDashboardService");

const getSalesDashboard = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await service.getSalesDashboardSummary(req.query);
    if (!result.ok) {
      return response.errorResponse(
        res,
        result.errors || {},
        result.message || "Unable to fetch sales dashboard.",
        result.statusCode || 400,
      );
    }
    return response.successResponse(
      res,
      { dashboard: result.dashboard },
      "Sales dashboard fetched.",
    );
  } catch (err) {
    console.error("getSalesDashboard:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

module.exports = {
  getSalesDashboard,
};
