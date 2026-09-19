const crypto = require("crypto");

const Order = require("../../../models/Order");
const CommonSettings = require("../../../models/CommonSettings");

const RANDOM_SUFFIX_LENGTH = 6;
const RANDOM_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MAX_ABBREVIATION_LENGTH = 12;
const MAX_COLLISION_RETRIES = 20;

const ORDER_NUMBER_ERROR = {
  GENERATION_FAILED: "ORDER_NUMBER_GENERATION_FAILED",
  ABBREVIATION_REQUIRED: "ORDER_NUMBER_ABBREVIATION_REQUIRED",
};

const createOrderNumberError = (code, message, meta = {}) => {
  const err = new Error(message);
  err.code = code;
  err.meta = meta;
  return err;
};

/**
 * UTC calendar date as YYMMDD (matches {ABBREV}{YYMMDD}{XXXXXX}).
 */
const formatDatePart = (date = new Date()) => {
  const y = String(date.getUTCFullYear()).slice(-2);
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
};

const normalizeAbbreviation = (raw) =>
  String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, MAX_ABBREVIATION_LENGTH);

/**
 * Application Settings → General Information → Abbreviation.
 */
const getOrderNumberAbbreviation = async (session = null) => {
  let query = CommonSettings.findOne({ singletonKey: "GLOBAL" })
    .select("abbreviation name")
    .lean();

  if (session) query = query.session(session);

  let settings = await query;
  if (!settings) {
    settings = await CommonSettings.getOrCreateSettings();
  }

  const abbreviation =
    normalizeAbbreviation(settings?.abbreviation) ||
    normalizeAbbreviation(settings?.name);

  if (!abbreviation) {
    throw createOrderNumberError(
      ORDER_NUMBER_ERROR.ABBREVIATION_REQUIRED,
      "Application abbreviation is not configured in Application Settings",
    );
  }

  return abbreviation;
};

const generateRandomSuffix = () => {
  const bytes = crypto.randomBytes(RANDOM_SUFFIX_LENGTH);
  let suffix = "";
  for (let i = 0; i < RANDOM_SUFFIX_LENGTH; i += 1) {
    suffix += RANDOM_CHARSET[bytes[i] % RANDOM_CHARSET.length];
  }
  return suffix;
};

const buildOrderNo = (abbreviation, datePart, randomSuffix) =>
  `${abbreviation}${datePart}${randomSuffix}`;

const parseOrderNoParts = (orderNo) => {
  const normalized = String(orderNo || "").trim().toUpperCase();
  if (normalized.length < 13) return null;

  const randomSuffix = normalized.slice(-RANDOM_SUFFIX_LENGTH);
  const datePart = normalized.slice(-12, -RANDOM_SUFFIX_LENGTH);
  const abbreviation = normalized.slice(0, -12);

  return { abbreviation, datePart, randomSuffix };
};

const isValidOrderNoFormat = (orderNo) => {
  const parts = parseOrderNoParts(orderNo);
  if (!parts) return false;

  const { abbreviation, datePart, randomSuffix } = parts;
  if (!abbreviation || !/^[A-Z0-9]+$/.test(abbreviation)) return false;
  if (!/^\d{6}$/.test(datePart)) return false;
  if (!/^[A-Z0-9]{6}$/.test(randomSuffix)) return false;
  return true;
};

const orderNoExists = async (orderNo, session = null) => {
  let query = Order.exists({ orderNo: String(orderNo).trim().toUpperCase() });
  if (session) query = query.session(session);
  const exists = await query;
  return Boolean(exists);
};

/**
 * Generates a unique order number: {ABBREVIATION}{YYMMDD}{6_CHAR_RANDOM_ALPHANUMERIC}
 * (UTC date; abbreviation from Application Settings).
 *
 * Random suffixes avoid daily sequence bottlenecks under concurrent checkout.
 * Retries on collision; callers should still handle Mongo duplicate-key (E11000) on `orderNo`.
 */
const generateOrderNo = async (options = {}) => {
  const { session = null, date = new Date() } = options;
  const abbreviation = await getOrderNumberAbbreviation(session);
  const datePart = formatDatePart(date);

  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt += 1) {
    const randomSuffix = generateRandomSuffix();
    const orderNo = buildOrderNo(abbreviation, datePart, randomSuffix);
    if (!(await orderNoExists(orderNo, session))) {
      return orderNo;
    }
  }

  throw createOrderNumberError(
    ORDER_NUMBER_ERROR.GENERATION_FAILED,
    "Unable to generate a unique order number after retries",
    { abbreviation, datePart, retries: MAX_COLLISION_RETRIES },
  );
};

module.exports = {
  RANDOM_SUFFIX_LENGTH,
  ORDER_NUMBER_ERROR,
  formatDatePart,
  normalizeAbbreviation,
  getOrderNumberAbbreviation,
  generateRandomSuffix,
  buildOrderNo,
  parseOrderNoParts,
  isValidOrderNoFormat,
  generateOrderNo,
};
