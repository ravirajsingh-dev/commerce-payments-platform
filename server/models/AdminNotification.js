const mongoose = require("mongoose");
const { Schema } = mongoose;

const AdminNotificationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["low_stock"],
      required: true,
      default: "low_stock",
    },
    /** `${variantId}:${size}` — empty size for legacy single-stock variants */
    dedupeKey: {
      type: String,
      required: true,
      trim: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "product_variants",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "products",
    },
    sku: { type: String, trim: true, default: "" },
    productName: { type: String, trim: true, default: "" },
    variantName: { type: String, trim: true, default: "" },
    size: { type: String, trim: true, lowercase: true, default: "" },
    sizeLabel: { type: String, trim: true, default: "" },
    stock: { type: Number, min: 0, default: 0 },
    threshold: { type: Number, min: 0, default: 0 },
    active: { type: Boolean, default: true, index: true },
    dismissedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

AdminNotificationSchema.index(
  { type: 1, dedupeKey: 1 },
  { unique: true, name: "admin_notification_type_dedupe_unique" },
);

const AdminNotification = mongoose.model(
  "admin_notifications",
  AdminNotificationSchema,
);

module.exports = AdminNotification;
