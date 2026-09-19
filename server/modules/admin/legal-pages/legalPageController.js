const response = require("../../../config/response");
const legalPageService = require("./legalPageService");

const listLegalPages = async (_req, res) => {
  try {
    const rows = await legalPageService.listAll();
    return response.successResponse(res, rows, "Legal pages retrieved.");
  } catch (err) {
    console.error("listLegalPages:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

const getLegalPage = async (req, res) => {
  try {
    const { slug } = req.params;
    const data = await legalPageService.getBySlugAdmin(slug);
    return response.successResponse(res, data, "Legal page retrieved.");
  } catch (err) {
    if (err?.code === "INVALID_LEGAL_PAGE_SLUG") {
      return response.errorResponse(res, [{ path: "slug", msg: "Invalid page." }], "Not Found", 404);
    }
    console.error("getLegalPage:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

const updateLegalPage = async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, sections } = req.body || {};
    const data = await legalPageService.updateBySlug(slug, { title, sections });
    return response.successResponse(res, data, "Legal page saved.");
  } catch (err) {
    if (err?.code === "INVALID_LEGAL_PAGE_SLUG") {
      return response.errorResponse(res, [{ path: "slug", msg: "Invalid page." }], "Not Found", 404);
    }
    console.error("updateLegalPage:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports = {
  listLegalPages,
  getLegalPage,
  updateLegalPage,
};
