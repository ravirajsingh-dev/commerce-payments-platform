export const DISCOUNT_TYPE_OPTIONS = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "flat", label: "Flat amount (₹)" },
];

export const COUPON_STATUS_OPTIONS = [
  { value: 1, label: "Active" },
  { value: 2, label: "Disabled" },
];

export const COUPON_STATUS_LABELS = {
  1: "Active",
  2: "Disabled",
};

export const getCouponStatusOptionByValue = (value) =>
  COUPON_STATUS_OPTIONS.find((item) => Number(item.value) === Number(value)) ||
  null;

export const getDiscountTypeOptionByValue = (value) =>
  DISCOUNT_TYPE_OPTIONS.find((item) => item.value === value) || null;

export const formatDiscount = (coupon = {}) => {
  if (coupon.discountType === "percentage") {
    return `${coupon.discountValue}%`;
  }
  return `₹${Number(coupon.discountValue || 0).toLocaleString("en-IN")}`;
};

export const formatInr = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

export const formatCouponDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatUsage = (coupon = {}) => {
  const used = Number(coupon.usedCount || 0);
  const limit = Number(coupon.usageLimit || 0);
  if (!limit) return `${used} / ∞`;
  return `${used} / ${limit}`;
};

export const formatPerUserLimit = (coupon = {}) => {
  const limit = Number(coupon.usageLimitPerUser || 0);
  if (!limit) return "Unlimited";
  return `${limit} per user`;
};

export const toApiPayload = (formData) => {
  const payload = {
    code: String(formData.code || "").trim(),
    title: String(formData.title || "").trim(),
    termsAndConditions: String(formData.termsAndConditions || "").trim(),
    discountType: formData.discountType,
    discountValue: Number(formData.discountValue),
    minOrderAmount: Number(formData.minOrderAmount) || 0,
    maxDiscountAmount: Number(formData.maxDiscountAmount) || 0,
    usageLimit: parseInt(formData.usageLimit, 10) || 0,
    usageLimitPerUser: parseInt(formData.usageLimitPerUser, 10) || 0,
    status: Number(formData.status) || 1,
  };

  if (formData.startsAt) {
    payload.startsAt = new Date(formData.startsAt).toISOString();
  } else {
    payload.startsAt = null;
  }

  if (formData.endsAt) {
    payload.endsAt = new Date(formData.endsAt).toISOString();
  } else {
    payload.endsAt = null;
  }

  return payload;
};

const toDatetimeLocalValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const couponFromApi = (coupon = {}) => ({
  code: coupon.code || "",
  title: coupon.title || "",
  termsAndConditions: coupon.termsAndConditions || "",
  discountType: coupon.discountType || "percentage",
  discountValue: coupon.discountValue ?? "",
  minOrderAmount: coupon.minOrderAmount ?? 0,
  maxDiscountAmount: coupon.maxDiscountAmount ?? 0,
  usageLimit: coupon.usageLimit ?? 0,
  usageLimitPerUser: coupon.usageLimitPerUser ?? 0,
  status: coupon.status ?? 1,
  startsAt: toDatetimeLocalValue(coupon.startsAt),
  endsAt: toDatetimeLocalValue(coupon.endsAt),
});
