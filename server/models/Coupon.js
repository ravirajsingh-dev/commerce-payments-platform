const mongoose = require("mongoose");
const { Schema } = mongoose;

const CouponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    termsAndConditions: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },

    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxDiscountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    usageLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    usageLimitPerUser: {
      type: Number,
      default: 0,
      min: 0,
    },

    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    startsAt: {
      type: Date,
      default: null,
    },

    endsAt: {
      type: Date,
      default: null,
    },

    status: {
      type: Number,
      enum: [1, 2],
      default: 1,
      index: true,
    },
  },
  { timestamps: true },
);

CouponSchema.index({
  status: 1,
  startsAt: 1,
  endsAt: 1,
});

const Coupon = mongoose.model("coupons", CouponSchema);

module.exports = Coupon;
