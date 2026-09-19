const mongoose = require("mongoose");
const { Schema } = mongoose;

const StockAdjustmentSchema = new Schema(
  {
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "product_variants",
      required: true,
      index: true,
    },

    size: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    /** Signed quantity change (negative reduces stock). */
    delta: {
      type: Number,
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    adminId: {
      type: Schema.Types.ObjectId,
      ref: "admins",
      required: true,
      index: true,
    },

    stockBefore: {
      type: Number,
      required: true,
      min: 0,
    },

    stockAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    sku: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
  },
  { timestamps: true },
);

StockAdjustmentSchema.index({ createdAt: -1 });
StockAdjustmentSchema.index({ variantId: 1, createdAt: -1 });

const StockAdjustment = mongoose.model(
  "stock_adjustments",
  StockAdjustmentSchema,
);

module.exports = StockAdjustment;
