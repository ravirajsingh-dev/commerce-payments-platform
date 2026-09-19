const mongoose = require("mongoose");
const { Schema } = mongoose;

const ForgotPasswordOtpSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      refPath: "userType",
      required: true,
      index: true,
    },
    userType: {
      type: String,
      enum: ["users", "admins", "sub_admins"],
      default: "users",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    resendCount: {
      type: Number,
      default: 0,
    },
    maxResends: {
      type: Number,
      default: 3,
    },
    lastResendAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

ForgotPasswordOtpSchema.index({ userId: 1, email: 1, isUsed: 1 });
ForgotPasswordOtpSchema.index({ userId: 1, userType: 1, email: 1, isUsed: 1 });

const ForgotPasswordOtp = mongoose.model(
  "forgot_password_otps",
  ForgotPasswordOtpSchema,
);

module.exports = ForgotPasswordOtp;
