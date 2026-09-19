const response = require("../../config/response");
const legalPageService = require("../admin/legal-pages/legalPageService");

const getPublicLegalPage = async (req, res) => {
  try {
    const { slug } = req.params;
    const data = await legalPageService.getBySlugPublic(slug);
    return response.successResponse(res, data, "Legal page retrieved.");
  } catch (err) {
    if (err?.code === "INVALID_LEGAL_PAGE_SLUG") {
      return response.errorResponse(res, [{ path: "slug", msg: "Invalid page." }], "Not Found", 404);
    }
    console.error("getPublicLegalPage:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports = {
  getPublicLegalPage,
};
