const response = require("../../config/response");
const HomeSlider = require("../../models/HomeSlider");
const HomeShowcase = require("../../models/HomeShowcase");
const SignatureStyle = require("../../models/SignatureStyle");
const Clientele = require("../../models/Clientele");
const homepageAdminService = require("../admin/homepage/homepageService");

const getHomepageContent = async (_req, res) => {
  try {
    await homepageAdminService.migrateLegacyHomeSlidersIfNeeded();
    const [heroSliders, showcases, signatureStyles, clientele] =
      await Promise.all([
        HomeSlider.find({ status: true })
          .sort({ order: 1, createdAt: -1 })
          .lean(),
        HomeShowcase.find({ isActive: true }).sort({ createdAt: -1 }).lean(),
        SignatureStyle.find({ isActive: true })
          .populate("productId", "name slug")
          .sort({ order: 1, createdAt: -1 })
          .lean(),
        Clientele.find({ isActive: true })
          .sort({ order: 1, createdAt: -1 })
          .lean(),
      ]);

    return response.successResponse(
      res,
      {
        heroSliders,
        showcases,
        signatureStyles,
        clientele,
      },
      "Homepage content fetched successfully.",
    );
  } catch (err) {
    console.error("getHomepageContent:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports = {
  getHomepageContent,
};
