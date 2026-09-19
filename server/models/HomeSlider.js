const mongoose = require("mongoose");
const { Schema } = mongoose;

const HomeSliderSchema = new Schema(
  {
    heading: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    shortDesc: {
      type: String,
      trim: true,
      default: "",
    },
    buttonText: {
      type: String,
      trim: true,
      default: "",
    },
    buttonLink: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    imagePublicId: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

HomeSliderSchema.index({ status: 1, order: 1, createdAt: -1 });

const HomeSlider = mongoose.model("home_sliders", HomeSliderSchema);

module.exports = HomeSlider;
