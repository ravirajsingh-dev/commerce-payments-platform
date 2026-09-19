const { uploadFileToR2, deleteFileFromR2 } = require("../../utils/r2Helper");

/**
 * Upload logo to Cloudflare R2
 * @param {Object} file - Multer file object (from memoryStorage)
 * @returns {Promise<Object>} - { url, key, size, mimeType }
 */
const uploadLogo = async (file) => {
  try {
    if (!file || !file.buffer) {
      throw new Error("Invalid file object");
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error("Only jpg, jpeg, png, and webp images are allowed");
    }

    // Validate file size (2MB limit)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      throw new Error("Logo size must be less than 2MB");
    }

    // Upload to R2 in 'logo' folder
    const uploadResult = await uploadFileToR2(file, "logo");
    return {
      url: uploadResult.url,
      key: uploadResult.publicId,
      size: file?.size,
      mimeType: file?.mimetype,
    };
  } catch (error) {
    console.error("Error uploading logo:", error);
    throw new Error(`Failed to upload logo: ${error.message}`);
  }
};

/**
 * Delete logo from Cloudflare R2
 * @param {String} logoKey - The key/path of the logo in R2
 * @returns {Promise<Boolean>} - True if successful
 */
const deleteLogo = async (logoKey) => {
  try {
    if (!logoKey) {
      return true; // No logo to delete, consider it successful
    }

    await deleteFileFromR2(logoKey);
    return true;
  } catch (error) {
    console.error("Error deleting logo:", error);
    // Don't throw error - log it but don't fail the operation
    // This ensures logo replacement works even if old logo deletion fails
    return false;
  }
};

module.exports = {
  uploadLogo,
  deleteLogo,
};
