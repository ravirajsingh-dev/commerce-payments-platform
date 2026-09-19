var response = require("../../config/response");
const CommonSettings = require("../../models/CommonSettings");

const normalizePublicAboutUs = (aboutUs = {}) => {
  const raw = aboutUs?.toObject ? aboutUs.toObject() : aboutUs || {};
  const title = raw.title || "";
  const intro = raw.intro || raw.description || "";

  let sections = Array.isArray(raw.sections)
    ? raw.sections.map((sec, index) => ({
        id: sec?.id || `sec_${index}`,
        heading: sec?.heading || "",
        description: sec?.description || "",
        imageUrl: sec?.imageUrl || "",
        order: typeof sec?.order === "number" ? sec.order : index,
      }))
    : [];

  if (sections.length === 0 && (raw.mission || raw.vision || raw.description)) {
    const legacy = [];
    if (raw.mission) {
      legacy.push({
        id: "legacy-mission",
        heading: "Our Mission",
        description: raw.mission,
        imageUrl: "",
        order: 0,
      });
    }
    if (raw.vision) {
      legacy.push({
        id: "legacy-vision",
        heading: "Our Vision",
        description: raw.vision,
        imageUrl: "",
        order: legacy.length,
      });
    }
    sections = legacy;
  }

  sections.sort((a, b) => a.order - b.order);
  return { title, intro, sections };
};

const normalizePublicContactUs = (contactUsPage = {}, general = {}) => {
  const raw = contactUsPage?.toObject
    ? contactUsPage.toObject()
    : contactUsPage || {};
  return {
    title: raw.title || "",
    intro: raw.intro || "",
    phone: raw.phone || general.contactUs || "",
    secondaryPhone: raw.secondaryPhone || "",
    email: raw.email || general.email || "",
    address: raw.address || general.address || "",
    businessHours: raw.businessHours || "",
  };
};

const getPublicCommonSettings = async (req, res) => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();

    const settingsObj = settings.toObject ? settings.toObject() : settings;

    const publicSettings = {
      name: settingsObj.name || "",
      abbreviation: settingsObj.abbreviation || "",
      contactUs: settingsObj.contactUs || "",
      email: settingsObj.email || "",
      address: settingsObj.address || "",
      logoUrl: settingsObj.logoUrl || "",
      socialMedia: {
        instagram: settingsObj.socialMedia?.instagram || "",
        facebook: settingsObj.socialMedia?.facebook || "",
        youtube: settingsObj.socialMedia?.youtube || "",
        zoomMeeting: settingsObj.socialMedia?.zoomMeeting || "",
      },
      aboutUs: normalizePublicAboutUs(settingsObj.aboutUs),
      contactUsPage: normalizePublicContactUs(
        settingsObj.contactUsPage,
        settingsObj,
      ),
    };

    return response.successResponse(
      res,
      publicSettings,
      "Public settings retrieved successfully.",
    );
  } catch (err) {
    console.error("Error in getPublicCommonSettings:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports = {
  getPublicCommonSettings,
};
