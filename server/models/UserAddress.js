const mongoose = require("mongoose");
const { Schema } = mongoose;

const PHONE_REGEX = /^\d{10}$/;
const PINCODE_REGEX = /^\d{6}$/;
const COUNTRY_REGEX = /^[A-Z]{2}$/;

const UserAddressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 10,
      match: [PHONE_REGEX, "Phone must be exactly 10 digits"],
    },

    addressLine1: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    addressLine2: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
      maxlength: 6,
      match: [PINCODE_REGEX, "Pincode must be exactly 6 digits"],
    },

    country: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "IN",
      maxlength: 2,
      match: [COUNTRY_REGEX, "Country must be a 2-letter ISO code"],
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

UserAddressSchema.index({ userId: 1, createdAt: -1 });
UserAddressSchema.index(
  { userId: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
  },
);

UserAddressSchema.pre("save", function () {
  if (typeof this.phone === "string") {
    this.phone = this.phone.trim();
  }
  if (typeof this.country === "string") {
    this.country = this.country.trim().toUpperCase();
  }
});

UserAddressSchema.pre(
  ["updateOne", "findOneAndUpdate", "updateMany"],
  function () {
    const update = this.getUpdate();
    const applyTrim = (target, field) => {
      if (typeof target?.[field] === "string") {
        target[field] = target[field].trim();
      }
    };

    applyTrim(update, "phone");
    if (typeof update?.country === "string") {
      update.country = update.country.trim().toUpperCase();
    }
    applyTrim(update?.$set, "phone");
    if (typeof update?.$set?.country === "string") {
      update.$set.country = update.$set.country.trim().toUpperCase();
    }
  },
);

const UserAddress = mongoose.model("user_addresses", UserAddressSchema);

module.exports = UserAddress;
