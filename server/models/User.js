const mongoose = require("mongoose");
const { Schema } = mongoose;

const PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 50,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      minlength: 10,
      maxlength: 10,
      match: [PHONE_REGEX, "Phone must be exactly 10 digits"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: [EMAIL_REGEX, "Invalid email format"],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 128,
    },
    status: {
      type: Number,
      default: 4, // 1 = Active, 2 = Inactive, 3 = Blocked, 4 = New
      enum: [1, 2, 3, 4],
    },
    last_login: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    uuid: {
      type: String,
      maxlength: 64,
    },
  },
  {
    timestamps: true,
  },
);

UserSchema.index({ status: 1 });
UserSchema.index({ phone: 1, createdAt: -1 });

UserSchema.pre("save", async function () {
  if (this.phone && typeof this.phone === "string") {
    this.phone = this.phone.trim();
  }
  if (this.email && typeof this.email === "string") {
    this.email = this.email.trim().toLowerCase();
  }
});

UserSchema.pre(
  ["updateOne", "findOneAndUpdate", "updateMany"],
  async function () {
    const update = this.getUpdate();

    if (typeof update?.phone === "string") {
      update.phone = update.phone.trim();
    }
    if (typeof update?.email === "string") {
      update.email = update.email.trim().toLowerCase();
    }
    if (typeof update?.$set?.phone === "string") {
      update.$set.phone = update.$set.phone.trim();
    }
    if (typeof update?.$set?.email === "string") {
      update.$set.email = update.$set.email.trim().toLowerCase();
    }
  },
);

const User = mongoose.model("users", UserSchema);
module.exports = User;
