const NAME_UNSAFE_HTML_REGEX = /<[^>]*>/g;
const NAME_UNSAFE_OPERATOR_REGEX = /\$[a-zA-Z]+/;
const TEN_DIGIT_PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
export const PASSWORD_MIN_LENGTH = 8;

export const sanitizePhone = (value) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 10);

export const sanitizeEmail = (value) => String(value ?? "").replace(/\s+/g, "");

export const sanitizeName = (value) => String(value ?? "").replace(/\s{2,}/g, " ");

const requiredRule = (path, msg) => ({ path, msg });

export const phoneRule = (path = "phone") => ({
  path,
  validator: (v) => TEN_DIGIT_PHONE_REGEX.test(String(v || "").trim()),
  msg: "Phone must be exactly 10 digits.",
});

const emailRule = (path = "email") => ({
  path,
  validator: (v) => EMAIL_REGEX.test(String(v || "").trim()),
  msg: "Please enter a valid email format.",
});

const nameRule = (path = "name") => ({
  path,
  validator: (v) => {
    const normalized = String(v || "").trim();
    return (
      normalized.length >= 3 &&
      normalized.length <= 50 &&
      !NAME_UNSAFE_HTML_REGEX.test(normalized) &&
      !NAME_UNSAFE_OPERATOR_REGEX.test(normalized)
    );
  },
  msg: "Name must be 3-50 characters and must not contain unsafe content.",
});

export const getContactValidationRules = ({
  namePath = "name",
  phonePath = "phone",
  emailPath = "email",
} = {}) => [
  requiredRule(namePath, "Please enter valid name."),
  requiredRule(phonePath, "Please enter valid phone number."),
  requiredRule(emailPath, "Please enter valid email address."),
  phoneRule(phonePath),
  emailRule(emailPath),
  nameRule(namePath),
];
