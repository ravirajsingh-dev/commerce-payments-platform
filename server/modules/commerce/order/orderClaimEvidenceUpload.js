const path = require("path");
const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(String(file.mimetype || "").toLowerCase());
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error("Only jpg, jpeg, png, webp images and pdf files are allowed."));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

module.exports = {
  uploadClaimEvidence: upload.single("file"),
};
