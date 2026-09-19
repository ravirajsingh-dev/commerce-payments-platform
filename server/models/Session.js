const mongoose = require("mongoose");

const { parseTokenExpiryTime } = require("../shared/utils/helper");
const { JWT_REFRESH_EXPIRATION } = require("../config/config");

const sessionSchema = new mongoose.Schema(
  {
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    sessionID: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshTokenExpiresAt: {
      type: Date,
      default: () =>
        Date.now() + parseTokenExpiryTime(JWT_REFRESH_EXPIRATION || "1d"),
    },
    role: {
      type: Number, // 1 = User, 2 = Admin
      required: true,
      default: 1,
    },
    ipAddress: {
      type: String,
      required: false, // Optional for backward compatibility with existing sessions
    },
    userAgent: {
      type: String,
      required: false, // Optional for backward compatibility with existing sessions
    },
  },
  {
    timestamps: true,
  },
);

sessionSchema.pre("save", async function () {
  if (this.isModified()) {
    this.refreshTokenExpiresAt = new Date(
      Date.now() + parseTokenExpiryTime(JWT_REFRESH_EXPIRATION || "1d"),
    );
  }
});

const Session = mongoose.model("sessions", sessionSchema);

module.exports = Session;
