const mongoose = require("mongoose");
const { Schema } = mongoose;

const FailedLoginAttemptSchema = new Schema(
  {
    identifier: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    blockedUntil: {
      type: Date,
      default: null,
      index: true,
    },
    lastFailedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Keep stale attempt entries from accumulating indefinitely.
FailedLoginAttemptSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 2 },
);

module.exports = mongoose.model(
  "failed_login_attempts",
  FailedLoginAttemptSchema,
);
