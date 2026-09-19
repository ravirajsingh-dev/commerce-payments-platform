const mongoose = require("mongoose");
const { Schema } = mongoose;

const CouponUsageSchema = new Schema(
  {
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "coupons",
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },

    orderId: {
      type: Schema.Types.ObjectId,
      ref: "orders",
      required: true,
      unique: true,
    },

    orderNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true },
);

CouponUsageSchema.index({ couponId: 1, userId: 1 });

const CouponUsage = mongoose.model("coupon_usages", CouponUsageSchema);

module.exports = CouponUsage;
