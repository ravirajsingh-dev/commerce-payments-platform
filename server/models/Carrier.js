const mongoose = require("mongoose");
const { Schema } = mongoose;
const { generateSlug } = require("../shared/utils/generateSlug");
const {
  FULFILLMENT_MODE,
  FULFILLMENT_MODE_VALUES,
} = require("../shared/constants/carrier");

const CarrierSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 140,
    },
    fulfillmentMode: {
      type: String,
      enum: FULFILLMENT_MODE_VALUES,
      default: FULFILLMENT_MODE.ONLINE.value,
      index: true,
    },
    trackingUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

CarrierSchema.pre("save", function () {
  if (this.slug) {
    this.slug = generateSlug(this.slug);
  } else if (this.name) {
    this.slug = generateSlug(this.name);
  }
});

const Carrier = mongoose.model("carriers", CarrierSchema);

module.exports = Carrier;
