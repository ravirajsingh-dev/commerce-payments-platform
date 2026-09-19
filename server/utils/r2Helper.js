const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const path = require("path");
const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY,
  R2_SECRET_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
} = require("../config/config");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

const sanitizeFileName = (fileName = "file") =>
  String(fileName || "file")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 120) || "file";

const normalizePublicId = (publicId) => {
  if (!publicId || typeof publicId !== "string") return "";
  const value = publicId.trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      const prefix = `${String(R2_PUBLIC_URL || "")
        .trim()
        .replace(/\/+$/g, "")}/`;
      if (prefix && value.startsWith(prefix)) {
        return decodeURIComponent(value.slice(prefix.length));
      }
      return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    } catch (err) {
      return "";
    }
  }

  return decodeURIComponent(value.replace(/^\/+/, ""));
};

const uploadObjectToR2 = async ({
  buffer,
  folder = "",
  fileName = "file",
  contentType = "application/octet-stream",
}) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Invalid file buffer");
  }

  const safeFolder = String(folder || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  const originalName = sanitizeFileName(
    path.basename(String(fileName || "file")),
  );
  const keyPrefix = safeFolder ? `${safeFolder}/` : "";
  const key = `${keyPrefix}${Date.now()}-${originalName}`;
  console.log("UPLOAD KEY:", key);
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return {
    url: `${String(R2_PUBLIC_URL || "").replace(/\/+$/g, "")}/${encodeURI(key)}`,
    publicId: key,
  };
};

const uploadFileToR2 = async (file, folder = "") => {
  if (!file || !file.buffer) {
    throw new Error("Invalid file object");
  }
  return uploadObjectToR2({
    buffer: file.buffer,
    folder,
    fileName: file.originalname,
    contentType: file.mimetype || "application/octet-stream",
  });
};

const deleteFileFromR2 = async (publicId) => {
  const key = normalizePublicId(publicId);
  if (!key) return;
  console.log("DELETE KEY:", key);
  await s3.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }),
  );
  console.log("Deleted from R2:", key);
};

const deleteMultipleFromR2 = async (publicIds = []) => {
  for (const id of Array.isArray(publicIds) ? publicIds : []) {
    await deleteFileFromR2(id);
  }
};

module.exports = {
  uploadFileToR2,
  deleteFileFromR2,
  deleteMultipleFromR2,
  normalizePublicId,
};
