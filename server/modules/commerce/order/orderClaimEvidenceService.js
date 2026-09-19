const mongoose = require("mongoose");
const Order = require("../../../models/Order");
const { isValidOrderNoFormat } = require("./orderNumberGenerator");
const { uploadFileToR2 } = require("../../../utils/r2Helper");

const CLAIM_EVIDENCE_FOLDER = "orders/claims/evidence";
const CLAIM_EVIDENCE_CATEGORIES = new Set(["images", "courierReceipt"]);

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const PROOF_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, "application/pdf"]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PROOF_BYTES = 10 * 1024 * 1024;

const ORDER_CLAIM_EVIDENCE_ERROR = {
  INVALID_ORDER_NO: "INVALID_ORDER_NO",
  NOT_FOUND: "ORDER_NOT_FOUND",
  INVALID_CATEGORY: "INVALID_CLAIM_EVIDENCE_CATEGORY",
  INVALID_FILE_TYPE: "INVALID_CLAIM_EVIDENCE_FILE_TYPE",
  FILE_TOO_LARGE: "CLAIM_EVIDENCE_FILE_TOO_LARGE",
  FILE_REQUIRED: "CLAIM_EVIDENCE_FILE_REQUIRED",
};

const normalizeOrderNo = (orderNo) => String(orderNo || "").trim().toUpperCase();
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const getAllowedMimeTypes = (category) =>
  category === "images" ? IMAGE_MIME_TYPES : PROOF_MIME_TYPES;

const getMaxBytes = (category) =>
  category === "images" ? MAX_IMAGE_BYTES : MAX_PROOF_BYTES;

const loadOwnedOrder = async (userId, orderNo) => {
  const normalizedOrderNo = normalizeOrderNo(orderNo);
  if (!isValidOrderNoFormat(normalizedOrderNo)) {
    return {
      ok: false,
      code: ORDER_CLAIM_EVIDENCE_ERROR.INVALID_ORDER_NO,
      message: "Invalid order number",
      errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
      statusCode: 400,
    };
  }

  const order = await Order.findOne({
    userId: toObjectId(userId),
    orderNo: normalizedOrderNo,
  })
    .select("_id orderNo userId status")
    .lean();

  if (!order) {
    return {
      ok: false,
      code: ORDER_CLAIM_EVIDENCE_ERROR.NOT_FOUND,
      message: "Order not found",
      errors: [{ path: "orderNo", msg: "Order not found." }],
      statusCode: 404,
    };
  }

  return { ok: true, order };
};

const validateEvidenceFile = (category, file) => {
  const normalizedCategory = String(category || "").trim();
  if (!CLAIM_EVIDENCE_CATEGORIES.has(normalizedCategory)) {
    return {
      ok: false,
      code: ORDER_CLAIM_EVIDENCE_ERROR.INVALID_CATEGORY,
      message: "Invalid evidence category",
      errors: [{ path: "category", msg: "Invalid evidence category." }],
      statusCode: 400,
    };
  }

  if (!file || !file.buffer) {
    return {
      ok: false,
      code: ORDER_CLAIM_EVIDENCE_ERROR.FILE_REQUIRED,
      message: "Evidence file is required",
      errors: [{ path: "file", msg: "Please select a file to upload." }],
      statusCode: 400,
    };
  }

  const mimeType = String(file.mimetype || "")
    .trim()
    .toLowerCase();
  if (!getAllowedMimeTypes(normalizedCategory).has(mimeType)) {
    return {
      ok: false,
      code: ORDER_CLAIM_EVIDENCE_ERROR.INVALID_FILE_TYPE,
      message: "Invalid file type",
      errors: [{ path: "file", msg: "This file type is not allowed for claim evidence." }],
      statusCode: 400,
    };
  }

  const size = Number(file.size || file.buffer?.length || 0);
  if (!Number.isFinite(size) || size <= 0) {
    return {
      ok: false,
      code: ORDER_CLAIM_EVIDENCE_ERROR.FILE_TOO_LARGE,
      message: "Invalid file size",
      errors: [{ path: "file", msg: "File size is invalid." }],
      statusCode: 400,
    };
  }

  if (size > getMaxBytes(normalizedCategory)) {
    return {
      ok: false,
      code: ORDER_CLAIM_EVIDENCE_ERROR.FILE_TOO_LARGE,
      message: "File too large",
      errors: [{ path: "file", msg: "File exceeds the allowed upload size." }],
      statusCode: 400,
    };
  }

  return { ok: true, category: normalizedCategory };
};

const uploadClaimEvidenceFile = async (userId, orderNo, category, file) => {
  const owned = await loadOwnedOrder(userId, orderNo);
  if (!owned.ok) {
    return owned;
  }

  const validation = validateEvidenceFile(category, file);
  if (!validation.ok) {
    return validation;
  }

  const folder = `${CLAIM_EVIDENCE_FOLDER}/${owned.order.orderNo}`;
  const uploaded = await uploadFileToR2(file, folder);

  return {
    ok: true,
    file: {
      url: uploaded.url,
      key: uploaded.publicId,
      label: String(file.originalname || "").trim(),
    },
  };
};

const loadOrderByOrderNo = async (orderNo) => {
  const normalizedOrderNo = normalizeOrderNo(orderNo);
  if (!isValidOrderNoFormat(normalizedOrderNo)) {
    return {
      ok: false,
      code: ORDER_CLAIM_EVIDENCE_ERROR.INVALID_ORDER_NO,
      message: "Invalid order number",
      errors: [{ path: "orderNo", msg: "Order number format is invalid." }],
      statusCode: 400,
    };
  }

  const order = await Order.findOne({ orderNo: normalizedOrderNo })
    .select("_id orderNo userId status")
    .lean();

  if (!order) {
    return {
      ok: false,
      code: ORDER_CLAIM_EVIDENCE_ERROR.NOT_FOUND,
      message: "Order not found",
      errors: [{ path: "orderNo", msg: "Order not found." }],
      statusCode: 404,
    };
  }

  return { ok: true, order };
};

const uploadClaimEvidenceFileForAdmin = async (orderNo, category, file) => {
  const loaded = await loadOrderByOrderNo(orderNo);
  if (!loaded.ok) {
    return loaded;
  }

  const validation = validateEvidenceFile(category, file);
  if (!validation.ok) {
    return validation;
  }

  const folder = `${CLAIM_EVIDENCE_FOLDER}/${loaded.order.orderNo}`;
  const uploaded = await uploadFileToR2(file, folder);

  return {
    ok: true,
    file: {
      url: uploaded.url,
      key: uploaded.publicId,
      label: String(file.originalname || "").trim(),
    },
  };
};

module.exports = {
  ORDER_CLAIM_EVIDENCE_ERROR,
  CLAIM_EVIDENCE_CATEGORIES,
  uploadClaimEvidenceFile,
  uploadClaimEvidenceFileForAdmin,
};
