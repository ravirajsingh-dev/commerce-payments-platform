const mongoose = require("mongoose");
const { validatePhone } = require("../../../shared/middleware/validationHelpers");
const {
  PHONE_REGEX,
  PINCODE_REGEX,
  COUNTRY_REGEX,
  DEFAULT_COUNTRY,
  CHECKOUT_ADDRESS_INLINE_FIELDS,
  CHECKOUT_ADDRESS_SNAPSHOT_FIELDS,
} = require("./checkoutAddressShape");

const rejectUnsafeText = (value, fieldLabel) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    return `${fieldLabel} must be a string`;
  }
  if (/<[^>]*>/g.test(value)) {
    return `${fieldLabel} cannot contain HTML or script tags`;
  }
  if (/\$[a-zA-Z]+/.test(value)) {
    return `${fieldLabel} contains invalid characters`;
  }
  return null;
};

const pushError = (errors, path, msg) => {
  errors.push({ path, msg });
};

const validateTextField = (errors, input, field, label, { required, maxLength }) => {
  const raw = input[field];
  if (raw === undefined || raw === null || raw === "") {
    if (required) {
      pushError(errors, field, `${label} is required`);
    }
    return;
  }
  if (typeof raw !== "string") {
    pushError(errors, field, `${label} must be a string`);
    return;
  }
  const value = raw.trim();
  if (required && !value) {
    pushError(errors, field, `${label} is required`);
    return;
  }
  if (value.length > maxLength) {
    pushError(errors, field, `${label} is too long`);
    return;
  }
  const unsafe = rejectUnsafeText(value, label);
  if (unsafe) {
    pushError(errors, field, unsafe);
  }
};

/**
 * Validate and normalize inline checkout / snapshot address fields.
 *
 * @param {Object} input - Request body or partial address payload
 * @param {Object} [options]
 * @param {boolean} [options.partial=false] - Allow omitting required fields (not used at checkout)
 * @returns {{ valid: boolean, errors: Array<{path: string, msg: string}>, snapshot: Object|null }}
 */
const validateCheckoutAddress = (input = {}, options = {}) => {
  const errors = [];
  const partial = options.partial === true;
  const body = input && typeof input === "object" ? input : {};

  for (const key of Object.keys(body)) {
    if (
      !CHECKOUT_ADDRESS_INLINE_FIELDS.includes(key) &&
      key !== "userAddressId"
    ) {
      pushError(errors, key, `Unexpected field "${key}"`);
    }
  }

  validateTextField(errors, body, "fullName", "Full name", {
    required: !partial,
    maxLength: 100,
  });
  validateTextField(errors, body, "addressLine1", "Address line 1", {
    required: !partial,
    maxLength: 200,
  });
  validateTextField(errors, body, "addressLine2", "Address line 2", {
    required: false,
    maxLength: 200,
  });
  validateTextField(errors, body, "city", "City", {
    required: !partial,
    maxLength: 80,
  });
  validateTextField(errors, body, "state", "State", {
    required: !partial,
    maxLength: 80,
  });

  if (!partial || body.phone !== undefined) {
    if (body.phone === undefined || body.phone === null || body.phone === "") {
      if (!partial) {
        pushError(errors, "phone", "Phone number is required");
      }
    } else {
      const phoneResult = validatePhone(body.phone);
      if (!phoneResult.valid) {
        pushError(errors, "phone", phoneResult.error);
      } else if (!PHONE_REGEX.test(phoneResult.sanitized)) {
        pushError(errors, "phone", "Phone must be exactly 10 digits");
      }
    }
  }

  if (!partial || body.pincode !== undefined) {
    const pincode =
      body.pincode === undefined || body.pincode === null
        ? ""
        : String(body.pincode).trim();
    if (!pincode && !partial) {
      pushError(errors, "pincode", "Pincode is required");
    } else if (pincode && !PINCODE_REGEX.test(pincode)) {
      pushError(errors, "pincode", "Pincode must be exactly 6 digits");
    }
  }

  if (body.country !== undefined && body.country !== null && body.country !== "") {
    const country = String(body.country).trim().toUpperCase();
    if (!COUNTRY_REGEX.test(country)) {
      pushError(errors, "country", "Country must be a 2-letter ISO code");
    }
  }

  if (body.userAddressId !== undefined && body.userAddressId !== null && body.userAddressId !== "") {
    if (!mongoose.Types.ObjectId.isValid(String(body.userAddressId))) {
      pushError(errors, "userAddressId", "Invalid saved address id");
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, snapshot: null };
  }

  const phoneResult = validatePhone(body.phone);
  const snapshot = {
    fullName: String(body.fullName).trim(),
    phone: phoneResult.sanitized,
    addressLine1: String(body.addressLine1).trim(),
    addressLine2:
      body.addressLine2 === undefined || body.addressLine2 === null
        ? ""
        : String(body.addressLine2).trim(),
    city: String(body.city).trim(),
    state: String(body.state).trim(),
    pincode: String(body.pincode).trim(),
    country:
      body.country === undefined || body.country === null || body.country === ""
        ? DEFAULT_COUNTRY
        : String(body.country).trim().toUpperCase(),
  };

  if (
    body.userAddressId !== undefined &&
    body.userAddressId !== null &&
    body.userAddressId !== ""
  ) {
    snapshot.userAddressId = String(body.userAddressId);
  }

  const ordered = {};
  for (const field of CHECKOUT_ADDRESS_SNAPSHOT_FIELDS) {
    if (snapshot[field] !== undefined) {
      ordered[field] = snapshot[field];
    }
  }

  return { valid: true, errors: [], snapshot: ordered };
};

/**
 * Map a UserAddress document to checkout snapshot shape.
 * @param {Object} address - UserAddress lean doc or mongoose document
 * @returns {Object}
 */
const userAddressToSnapshot = (address) => {
  const snapshot = {
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 || "",
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country || DEFAULT_COUNTRY,
    userAddressId: String(address._id),
  };

  const ordered = {};
  for (const field of CHECKOUT_ADDRESS_SNAPSHOT_FIELDS) {
    if (snapshot[field] !== undefined) {
      ordered[field] = snapshot[field];
    }
  }
  return ordered;
};

/**
 * Validate a complete Order.addressSnapshot (strict — no extra keys).
 * @param {Object} snapshot
 * @returns {{ valid: boolean, errors: Array<{path: string, msg: string}>, snapshot: Object|null }}
 */
const validateAndNormalizeOrderAddressSnapshot = (snapshot) =>
  validateCheckoutAddress(snapshot, { partial: false });

module.exports = {
  validateCheckoutAddress,
  validateAndNormalizeOrderAddressSnapshot,
  userAddressToSnapshot,
};
