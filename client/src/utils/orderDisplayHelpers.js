import { ORDER_PAYMENT_STATUS_LABELS, label } from "@src/constants/order";

export const formatOrderStatus = (status) =>
  label(status) || String(status || "").replace(/_/g, " ");

export const formatPaymentStatus = (status) =>
  ORDER_PAYMENT_STATUS_LABELS[status] || String(status || "").replace(/_/g, " ");

export const formatOrderDate = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

export const formatOrderAddress = (snapshot = {}) => {
  const line2 = snapshot.addressLine2 ? `, ${snapshot.addressLine2}` : "";
  return `${snapshot.fullName}\n${snapshot.phone}\n${snapshot.addressLine1}${line2}\n${snapshot.city}, ${snapshot.state} ${snapshot.pincode}\n${snapshot.country}`;
};

/** Single-line shipping summary for order detail strips. */
export const formatOrderShippingLine = (snapshot = {}) => {
  if (!snapshot?.fullName) return "";
  const line2 = snapshot.addressLine2 ? `, ${snapshot.addressLine2}` : "";
  const location = [snapshot.city, snapshot.state, snapshot.pincode]
    .filter(Boolean)
    .join(", ");
  const addressPart = `${snapshot.addressLine1 || ""}${line2}${
    location ? `, ${location}` : ""
  }`;
  const parts = [snapshot.fullName, snapshot.phone, addressPart].filter(Boolean);
  return parts.join(" · ");
};

export const getProductDetailPath = (item = {}) => {
  const slug = item.productSlugSnapshot;
  const variantId = item.variantId;
  if (!slug || !variantId) return null;
  return `/collection/${slug}/${variantId}`;
};
