const { check } = require("express-validator");
const { validatePhoneField } = require("../../../shared/middleware/validateRequest");

const rejectUnsafeText = (fieldLabel) => (value) => {
  if (value === undefined || value === null || value === "") {
    return true;
  }
  if (typeof value !== "string") {
    throw new Error(`${fieldLabel} must be a string`);
  }
  if (/<[^>]*>/g.test(value)) {
    throw new Error(`${fieldLabel} cannot contain HTML or script tags`);
  }
  if (/\$[a-zA-Z]+/.test(value)) {
    throw new Error(`${fieldLabel} contains invalid characters`);
  }
  return true;
};

const labelField = (required = true) => {
  const chain = check("label", "Label is required")
    .isString()
    .trim()
    .isLength({ min: 1, max: 40 })
    .custom(rejectUnsafeText("Label"));
  return required ? chain.notEmpty() : chain.optional({ values: "falsy" });
};

const fullNameField = (required = true) => {
  const chain = check("fullName", "Full name is required")
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .custom(rejectUnsafeText("Full name"));
  return required ? chain.notEmpty() : chain.optional({ values: "falsy" });
};

const addressLine1Field = (required = true) => {
  const chain = check("addressLine1", "Address line 1 is required")
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .custom(rejectUnsafeText("Address line 1"));
  return required ? chain.notEmpty() : chain.optional({ values: "falsy" });
};

const addressLine2Field = () =>
  check("addressLine2")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ max: 200 })
    .custom(rejectUnsafeText("Address line 2"));

const cityField = (required = true) => {
  const chain = check("city", "City is required")
    .isString()
    .trim()
    .isLength({ min: 1, max: 80 })
    .custom(rejectUnsafeText("City"));
  return required ? chain.notEmpty() : chain.optional({ values: "falsy" });
};

const stateField = (required = true) => {
  const chain = check("state", "State is required")
    .isString()
    .trim()
    .isLength({ min: 1, max: 80 })
    .custom(rejectUnsafeText("State"));
  return required ? chain.notEmpty() : chain.optional({ values: "falsy" });
};

const pincodeField = (required = true) => {
  const chain = check("pincode", "Pincode is required")
    .isString()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be exactly 6 digits");
  return required ? chain.notEmpty() : chain.optional({ values: "falsy" });
};

const countryField = () =>
  check("country")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ min: 2, max: 2 })
    .matches(/^[A-Za-z]{2}$/)
    .withMessage("Country must be a 2-letter ISO code");

const isDefaultField = () =>
  check("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean");

const createAddressValidators = [
  labelField(true),
  fullNameField(true),
  validatePhoneField("phone"),
  addressLine1Field(true),
  addressLine2Field(),
  cityField(true),
  stateField(true),
  pincodeField(true),
  countryField(),
  isDefaultField(),
];

const updateAddressValidators = [
  labelField(false),
  fullNameField(false),
  validatePhoneField("phone"),
  addressLine1Field(false),
  addressLine2Field(),
  cityField(false),
  stateField(false),
  pincodeField(false),
  countryField(),
  isDefaultField(),
  check().custom((_value, { req }) => {
    const allowed = [
      "label",
      "fullName",
      "phone",
      "addressLine1",
      "addressLine2",
      "city",
      "state",
      "pincode",
      "country",
      "isDefault",
    ];
    const hasField = allowed.some((key) => req.body[key] !== undefined);
    if (!hasField) {
      throw new Error("At least one field is required to update");
    }
    return true;
  }),
];

module.exports = {
  createAddressValidators,
  updateAddressValidators,
};
