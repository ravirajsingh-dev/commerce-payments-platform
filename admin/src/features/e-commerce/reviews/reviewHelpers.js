export const REVIEW_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const REVIEW_STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const RATING_OPTIONS = [1, 2, 3, 4, 5].map((value) => ({
  value: String(value),
  label: `${value} star${value > 1 ? "s" : ""}`,
}));

export const getReviewStatusOptionByValue = (value) =>
  REVIEW_STATUS_OPTIONS.find((item) => item.value === value) || null;

export const getRatingOptionByValue = (value) =>
  RATING_OPTIONS.find((item) => item.value === String(value)) || null;

export const formatReviewDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const reviewStatusClass = (status) => {
  if (status === "approved") return "active";
  if (status === "rejected") return "inactive";
  return "warning";
};

export const formatReviewRating = (rating) => {
  const value = Number(rating);
  if (!Number.isFinite(value) || value < 1 || value > 5) return "—";
  return `${value}/5`;
};
