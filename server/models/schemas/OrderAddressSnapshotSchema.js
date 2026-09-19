const mongoose = require("mongoose");
const { Schema } = mongoose;
const {
  PHONE_REGEX,
  PINCODE_REGEX,
  COUNTRY_REGEX,
  DEFAULT_COUNTRY,
} = require("../../modules/commerce/address/checkoutAddressShape");

/**
 * Strict sub-schema for Order.addressSnapshot (Phase 5).
 * Business rules are normalized via validateCheckoutAddress on Order validate.
 */
const OrderAddressSnapshotSchema = new Schema(
  {
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
      default: DEFAULT_COUNTRY,
      maxlength: 2,
      match: [COUNTRY_REGEX, "Country must be a 2-letter ISO code"],
    },
    userAddressId: {
      type: Schema.Types.ObjectId,
      ref: "user_addresses",
      default: undefined,
    },
  },
  { _id: false, strict: true },
);

module.exports = OrderAddressSnapshotSchema;
