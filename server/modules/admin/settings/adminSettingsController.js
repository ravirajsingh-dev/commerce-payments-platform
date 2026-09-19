const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const response = require("../../../config/response");
const CommonSettings = require("../../../models/CommonSettings");
const Admin = require("../../../models/Admin");
const SubAdmin = require("../../../models/SubAdmin");
const Session = require("../../../models/Session");
const { comparePasswords } = require("../../../shared/utils/helper");
const {
  uploadLogo,
  deleteLogo,
} = require("../../../infra/storage/logoService");
const {
  uploadAboutUsImage,
  deleteAboutUsImage,
} = require("../../../infra/storage/aboutUsImageService");

const ABOUT_US_SECTION_FIELD = /^aboutUsSection_(.+)$/;
const MAX_ABOUT_US_SECTIONS = 30;

const normalizeAboutUs = (aboutUs = {}) => {
  const raw = aboutUs?.toObject ? aboutUs.toObject() : aboutUs || {};
  const title = raw.title || "";
  const intro = raw.intro || raw.description || "";

  let sections = Array.isArray(raw.sections)
    ? raw.sections.map((sec, index) => ({
        id: sec?.id || `sec_${index}`,
        heading: sec?.heading || "",
        description: sec?.description || "",
        imageUrl: sec?.imageUrl || "",
        imageKey: sec?.imageKey || "",
        order: typeof sec?.order === "number" ? sec.order : index,
      }))
    : [];

  if (
    sections.length === 0 &&
    (raw.mission || raw.vision || raw.description)
  ) {
    const legacy = [];
    if (raw.mission) {
      legacy.push({
        id: "legacy-mission",
        heading: "Our Mission",
        description: raw.mission,
        imageUrl: "",
        imageKey: "",
        order: 0,
      });
    }
    if (raw.vision) {
      legacy.push({
        id: "legacy-vision",
        heading: "Our Vision",
        description: raw.vision,
        imageUrl: "",
        imageKey: "",
        order: legacy.length,
      });
    }
    sections = legacy;
  }

  sections.sort((a, b) => a.order - b.order);
  return { title, intro, sections };
};

const applyAboutUsUpdate = async (settings, aboutUsPayload, uploadedFiles = []) => {
  const existing = normalizeAboutUs(settings.aboutUs);
  const incomingTitle =
    aboutUsPayload?.title !== undefined ? aboutUsPayload.title : existing.title;
  const incomingIntro =
    aboutUsPayload?.intro !== undefined
      ? aboutUsPayload.intro
      : aboutUsPayload?.description !== undefined
        ? aboutUsPayload.description
        : existing.intro;

  const incomingSections = Array.isArray(aboutUsPayload?.sections)
    ? aboutUsPayload.sections
    : existing.sections;

  if (incomingSections.length > MAX_ABOUT_US_SECTIONS) {
    throw new Error(
      `About Us supports at most ${MAX_ABOUT_US_SECTIONS} sections.`,
    );
  }

  const fileBySectionId = {};
  for (const file of uploadedFiles) {
    const match = file.fieldname?.match(ABOUT_US_SECTION_FIELD);
    if (match) fileBySectionId[match[1]] = file;
  }

  const oldById = Object.fromEntries(
    existing.sections.map((section) => [section.id, section]),
  );
  const newIds = new Set();
  const processedSections = [];

  for (let index = 0; index < incomingSections.length; index += 1) {
    const sec = incomingSections[index] || {};
    const id =
      (typeof sec.id === "string" && sec.id.trim()) ||
      `sec_${Date.now()}_${index}`;
    newIds.add(id);

    const prev = oldById[id] || {};
    let imageUrl = prev.imageUrl || "";
    let imageKey = prev.imageKey || "";

    if (sec.imageUrl !== undefined && sec.imageUrl !== "") {
      imageUrl = sec.imageUrl;
    }
    if (sec.imageKey !== undefined && sec.imageKey !== "") {
      imageKey = sec.imageKey;
    }

    if (fileBySectionId[id]) {
      const uploadResult = await uploadAboutUsImage(fileBySectionId[id]);
      if (imageKey) await deleteAboutUsImage(imageKey);
      imageUrl = uploadResult.url;
      imageKey = uploadResult.key;
    } else if (sec.clearImage === true || sec.clearImage === "true") {
      if (imageKey) await deleteAboutUsImage(imageKey);
      imageUrl = "";
      imageKey = "";
    }

    processedSections.push({
      id,
      heading: String(sec.heading || "").trim(),
      description: String(sec.description || "").trim(),
      imageUrl,
      imageKey,
      order: typeof sec.order === "number" ? sec.order : index,
    });
  }

  for (const oldSection of existing.sections) {
    if (!newIds.has(oldSection.id) && oldSection.imageKey) {
      await deleteAboutUsImage(oldSection.imageKey);
    }
  }

  settings.aboutUs = {
    title: String(incomingTitle || "").trim(),
    intro: String(incomingIntro || "").trim(),
    sections: processedSections,
  };
  settings.markModified("aboutUs");
};

const buildAdminSettingsResponse = (settingsDoc) => {
  const settings = settingsDoc?.toObject
    ? settingsDoc.toObject()
    : settingsDoc || {};

  return {
    _id: settings._id,
    singletonKey: settings.singletonKey || "GLOBAL",
    __v: settings.__v ?? 0,
    name: settings.name || "",
    abbreviation: settings.abbreviation || "",
    contactUs: settings.contactUs || "",
    email: settings.email || "",
    address: settings.address || "",
    logoUrl: settings.logoUrl || "",
    logoKey: settings.logoKey || "",
    socialMedia: {
      instagram: settings.socialMedia?.instagram || "",
      facebook: settings.socialMedia?.facebook || "",
      youtube: settings.socialMedia?.youtube || "",
      zoomMeeting: settings.socialMedia?.zoomMeeting || "",
    },
    loginEnabled:
      settings.loginEnabled !== undefined ? settings.loginEnabled : true,
    registerEnabled:
      settings.registerEnabled !== undefined ? settings.registerEnabled : true,
    flatShippingFee:
      settings.flatShippingFee !== undefined
        ? Math.max(0, Number(settings.flatShippingFee) || 0)
        : 0,
    gstin: settings.gstin || "",
    defaultGstRate:
      settings.defaultGstRate !== undefined
        ? Math.max(0, Math.min(100, Number(settings.defaultGstRate) || 0))
        : 0,
    lowStockThreshold:
      settings.lowStockThreshold !== undefined
        ? Math.max(0, Math.floor(Number(settings.lowStockThreshold) || 0))
        : 5,
    aboutUs: normalizeAboutUs(settings.aboutUs),
    contactUsPage: {
      title: settings.contactUsPage?.title || "",
      intro: settings.contactUsPage?.intro || "",
      phone: settings.contactUsPage?.phone || "",
      secondaryPhone: settings.contactUsPage?.secondaryPhone || "",
      email: settings.contactUsPage?.email || "",
      address: settings.contactUsPage?.address || "",
      businessHours: settings.contactUsPage?.businessHours || "",
    },
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
};

/**
 * @route GET /api/admin/settings
 * @desc Get common settings (auto-creates if not found)
 * @access Public
 */
const getCommonSettings = async (req, res) => {
  try {
    // Get or create settings (ensures one document exists)
    const settings = await CommonSettings.getOrCreateSettings();
    const cleanedSettings = buildAdminSettingsResponse(settings);

    return response.successResponse(
      res,
      cleanedSettings,
      "Settings retrieved successfully.",
    );
  } catch (err) {
    console.error("Error in getCommonSettings:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route PUT /api/admin/settings
 * @desc Update common settings
 * @access Private (Admin only)
 */
const updateCommonSettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    // Validate transaction password
    const { txn_password } = req.body;
    if (!txn_password) {
      return response.errorResponse(
        res,
        { msg: "Transaction password is required." },
        "Transaction password is required.",
        400,
      );
    }

    // Get admin/subadmin and validate transaction password
    // Detect user role from auth token
    const adminID = req.user.id;
    const userRole = req.user.role;

    let admin;
    if (userRole === 2) {
      // Admin
      admin = await Admin.findById(adminID);
    } else if (userRole === 3) {
      // SubAdmin
      admin = await SubAdmin.findById(adminID);
    } else {
      // Fallback: try Admin first, then SubAdmin
      admin = await Admin.findById(adminID);
      if (!admin) {
        admin = await SubAdmin.findById(adminID);
      }
    }

    if (!admin) {
      return response.errorResponse(
        res,
        [{ msg: "Admin not found." }],
        "Admin not found.",
        400,
      );
    }

    // Check if admin has transaction password set
    if (!admin.txn_password) {
      return response.errorResponse(
        res,
        {
          msg: "Transaction password not set. Please set your transaction password first.",
        },
        "Transaction password not set.",
        400,
      );
    }

    // Validate transaction password
    const validPassword = await comparePasswords(
      txn_password,
      admin.txn_password,
    );
    if (!validPassword) {
      return response.errorResponse(
        res,
        [
          {
            path: "txn_password",
            msg: "Incorrect transaction password. Please double-check your credentials and try again.",
          },
        ],
        "Incorrect Transaction Password.",
        400,
      );
    }

    // Get or create settings first
    let settings = await CommonSettings.getOrCreateSettings();

    const uploadedFiles = Array.isArray(req.files) ? req.files : [];

    // Handle logo upload if provided
    const logoFile =
      req.file ||
      uploadedFiles.find((file) => file.fieldname === "logo") ||
      (req.files &&
        Array.isArray(req.files.logo) &&
        req.files.logo[0]) ||
      null;
    if (logoFile) {
      try {
        const uploadResult = await uploadLogo(logoFile);

        if (settings.logoKey) {
          await deleteLogo(settings.logoKey);
        }

        settings.logoUrl = uploadResult.url;
        settings.logoKey = uploadResult.key;
      } catch (error) {
        return response.errorResponse(
          res,
          [{ path: "logo", msg: error.message }],
          error.message,
          400,
        );
      }
    }

    // Extract allowed fields from request body
    // Handle both JSON and FormData (FormData sends nested objects as JSON strings)
    let {
      name,
      contactUs,
      email,
      address,
      abbreviation,
      socialMedia,
      loginEnabled,
      registerEnabled,
      flatShippingFee,
      gstin,
      defaultGstRate,
      lowStockThreshold,
      aboutUs,
      contactUsPage,
    } = req.body;

    // Parse nested objects if they are JSON strings (from FormData)
    if (typeof socialMedia === "string") {
      try {
        socialMedia = JSON.parse(socialMedia);
      } catch (e) {
        socialMedia = {};
      }
    }
    if (typeof aboutUs === "string") {
      try {
        aboutUs = JSON.parse(aboutUs);
      } catch (e) {
        aboutUs = {};
      }
    }
    if (typeof contactUsPage === "string") {
      try {
        contactUsPage = JSON.parse(contactUsPage);
      } catch (e) {
        contactUsPage = {};
      }
    }
    // Helper function to parse boolean from string (FormData sends booleans as strings)
    const parseBoolean = (value) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        return value === "true" || value === "on";
      }
      return Boolean(value);
    };

    // Update general information - REQUIRED FIELDS: never overwrite with empty/null
    // Only assign when we have a valid non-empty trimmed value
    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (trimmedName) settings.name = trimmedName;

    const trimmedContactUs =
      typeof contactUs === "string" ? contactUs.trim() : "";
    if (trimmedContactUs) settings.contactUs = trimmedContactUs;

    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    if (trimmedEmail) settings.email = trimmedEmail.toLowerCase();

    // Optional fields - trim when present, allow empty
    if (address !== undefined) settings.address = String(address).trim();
    if (abbreviation !== undefined)
      settings.abbreviation = String(abbreviation).trim();

    // Update authentication settings
    // Check if login or register is being disabled
    const wasLoginEnabled = settings.loginEnabled;
    const wasRegisterEnabled = settings.registerEnabled;

    if (loginEnabled !== undefined) {
      settings.loginEnabled = parseBoolean(loginEnabled);
    }
    if (registerEnabled !== undefined) {
      settings.registerEnabled = parseBoolean(registerEnabled);
    }

    if (flatShippingFee !== undefined) {
      const fee = Number(flatShippingFee);
      if (!Number.isFinite(fee) || fee < 0) {
        return response.errorResponse(
          res,
          [{ path: "flatShippingFee", msg: "Shipping fee must be zero or greater." }],
          "Validation Error",
          400,
        );
      }
      settings.flatShippingFee = fee;
    }

    if (gstin !== undefined) {
      const normalizedGstin = String(gstin).trim().toUpperCase().replace(/\s+/g, "");
      const { isValidGstin } = require("../../commerce/checkout/gstService");
      if (normalizedGstin && !isValidGstin(normalizedGstin)) {
        return response.errorResponse(
          res,
          [{ path: "gstin", msg: "Enter a valid 15-character GSTIN." }],
          "Validation Error",
          400,
        );
      }
      settings.gstin = normalizedGstin;
    }

    if (defaultGstRate !== undefined) {
      const rate = Number(defaultGstRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return response.errorResponse(
          res,
          [{ path: "defaultGstRate", msg: "GST rate must be between 0 and 100." }],
          "Validation Error",
          400,
        );
      }
      settings.defaultGstRate = rate;
    }

    if (lowStockThreshold !== undefined) {
      const threshold = Number(lowStockThreshold);
      if (!Number.isFinite(threshold) || threshold < 0) {
        return response.errorResponse(
          res,
          [
            {
              path: "lowStockThreshold",
              msg: "Low stock threshold must be zero or greater.",
            },
          ],
          "Validation Error",
          400,
        );
      }
      settings.lowStockThreshold = Math.floor(threshold);
    }

    // If login or register is being disabled, logout all users (but not admins)
    // Session role: 1 = User, 2 = Admin
    if (
      (loginEnabled === false && wasLoginEnabled === true) ||
      (registerEnabled === false && wasRegisterEnabled === true)
    ) {
      try {
        // Delete all sessions for regular users only (role = 1)
        await Session.deleteMany({ role: 1 });
      } catch (err) {
        console.error("Error logging out all users:", err);
        // Don't fail the request if logout fails, just log the error
      }
    }

    // Update social media links
    if (socialMedia) {
      if (socialMedia.instagram !== undefined)
        settings.socialMedia.instagram = socialMedia.instagram;
      if (socialMedia.facebook !== undefined)
        settings.socialMedia.facebook = socialMedia.facebook;
      if (socialMedia.youtube !== undefined)
        settings.socialMedia.youtube = socialMedia.youtube;
      if (socialMedia.zoomMeeting !== undefined)
        settings.socialMedia.zoomMeeting = socialMedia.zoomMeeting;
    }

    // Update About Us page content (dynamic sections + images)
    if (aboutUs) {
      try {
        await applyAboutUsUpdate(settings, aboutUs, uploadedFiles);
      } catch (aboutUsError) {
        return response.errorResponse(
          res,
          [{ path: "aboutUs", msg: aboutUsError.message }],
          aboutUsError.message,
          400,
        );
      }
    }

    // Update Contact Us page content
    if (contactUsPage) {
      // Initialize contactUsPage object if it doesn't exist
      if (!settings.contactUsPage) {
        settings.contactUsPage = {
          title: "",
          intro: "",
          phone: "",
          secondaryPhone: "",
          email: "",
          address: "",
          businessHours: "",
        };
      }
      if (contactUsPage.title !== undefined)
        settings.contactUsPage.title = contactUsPage.title;
      if (contactUsPage.intro !== undefined)
        settings.contactUsPage.intro = contactUsPage.intro;
      if (contactUsPage.phone !== undefined)
        settings.contactUsPage.phone = contactUsPage.phone;
      if (contactUsPage.secondaryPhone !== undefined)
        settings.contactUsPage.secondaryPhone = contactUsPage.secondaryPhone;
      if (contactUsPage.email !== undefined)
        settings.contactUsPage.email = contactUsPage.email;
      if (contactUsPage.address !== undefined)
        settings.contactUsPage.address = contactUsPage.address;
      if (contactUsPage.businessHours !== undefined)
        settings.contactUsPage.businessHours = contactUsPage.businessHours;
    }

    // Save updated settings
    await settings.save();
    const cleanedSettings = buildAdminSettingsResponse(settings);

    return response.successResponse(
      res,
      cleanedSettings,
      "Settings updated successfully.",
    );
  } catch (err) {
    console.error("Error in updateCommonSettings:", err);

    // Handle Mongoose validation errors with structured response
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return res.status(400).json({
        status: false,
        message: "Validation failed",
        errors,
      });
    }

    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports = {
  getCommonSettings,
  updateCommonSettings,
};
