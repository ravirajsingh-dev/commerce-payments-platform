const { uploadFileToR2, deleteFileFromR2 } = require("../../utils/r2Helper");

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024;

const uploadAboutUsImage = async (file) => {
  if (!file?.buffer) {
    throw new Error("Invalid file object");
  }
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error("Only jpg, jpeg, png, and webp images are allowed");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("Image size must be less than 2MB");
  }

  const uploadResult = await uploadFileToR2(file, "about-us");
  return {
    url: uploadResult.url,
    key: uploadResult.publicId,
  };
};

const deleteAboutUsImage = async (imageKey) => {
  if (!imageKey) return true;
  try {
    await deleteFileFromR2(imageKey);
    return true;
  } catch (error) {
    console.error("Error deleting about-us image:", error);
    return false;
  }
};

module.exports = {
  uploadAboutUsImage,
  deleteAboutUsImage,
};
