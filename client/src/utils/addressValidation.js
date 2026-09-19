import {
  phoneRule,
  sanitizePhone,
} from "@src/utils/inputValidation";

export { sanitizePhone };

const PINCODE_REGEX = /^\d{6}$/;
const COUNTRY_REGEX = /^[A-Z]{2}$/;

export const sanitizePincode = (value) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 6);

export const sanitizeCountry = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 2);

const safeTextRule = (path, label, { required = true, max = 100 } = {}) => ({
  path,
  validator: (v) => {
    const normalized = String(v ?? "").trim();
    if (!normalized) return !required;
    if (normalized.length > max) return false;
    if (/<[^>]*>/g.test(normalized)) return false;
    if (/\$[a-zA-Z]+/.test(normalized)) return false;
    return true;
  },
  msg: required ? `${label} is required.` : `${label} is invalid.`,
});

export const getAddressValidationRules = () => [
  safeTextRule("label", "Label", { required: true, max: 40 }),
  safeTextRule("fullName", "Full name", { required: true, max: 100 }),
  phoneRule("phone"),
  safeTextRule("addressLine1", "Address line 1", { required: true, max: 200 }),
  safeTextRule("addressLine2", "Address line 2", { required: false, max: 200 }),
  safeTextRule("city", "City", { required: true, max: 80 }),
  safeTextRule("state", "State", { required: true, max: 80 }),
  {
    path: "pincode",
    validator: (v) => PINCODE_REGEX.test(String(v ?? "").trim()),
    msg: "Pincode must be exactly 6 digits.",
  },
  {
    path: "country",
    validator: (v) => {
      const code = sanitizeCountry(v || "IN");
      return COUNTRY_REGEX.test(code);
    },
    msg: "Country must be a 2-letter code.",
  },
];

export const emptyAddressForm = {
  label: "",
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  country: "IN",
  isDefault: false,
};

export const addressToFormData = (address = {}) => ({
  label: address.label || "",
  fullName: address.fullName || "",
  phone: address.phone || "",
  addressLine1: address.addressLine1 || "",
  addressLine2: address.addressLine2 || "",
  city: address.city || "",
  state: address.state || "",
  pincode: address.pincode || "",
  country: address.country || "IN",
  isDefault: Boolean(address.isDefault),
});

export const sanitizeAddressForm = (formData) => ({
  label: String(formData.label || "").trim(),
  fullName: String(formData.fullName || "").trim(),
  phone: sanitizePhone(formData.phone),
  addressLine1: String(formData.addressLine1 || "").trim(),
  addressLine2: String(formData.addressLine2 || "").trim(),
  city: String(formData.city || "").trim(),
  state: String(formData.state || "").trim(),
  pincode: sanitizePincode(formData.pincode),
  country: sanitizeCountry(formData.country || "IN"),
  isDefault: Boolean(formData.isDefault),
});
