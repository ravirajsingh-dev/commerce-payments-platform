const express = require("express");
const router = express.Router();
const multer = require("multer");
const { AdminAuth } = require("../../shared/middleware/auth");
const { checkPermission } = require("../../shared/middleware/permissions");
const {
  getCommonSettings,
  updateCommonSettings,
} = require("./settings/adminSettingsController");

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(
    require("path").extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only jpg, jpeg, png, and webp images are allowed!"));
  }
};

// Multer middleware configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
    files: 32,
  },
  fileFilter: fileFilter,
});

// @route GET api/admin/settings
// @desc Get common settings (auto-creates if not found)
// @access Public (branding on login and unauthenticated admin UI)
router.get("/settings", getCommonSettings);

// @route PUT api/admin/settings
// @desc Update common settings
// @access Private (Admin only)
router.put(
  "/settings",
  [AdminAuth, checkPermission("application-settings")],
  upload.any(),
  updateCommonSettings,
);

module.exports = router;
