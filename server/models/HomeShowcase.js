const mongoose = require("mongoose");
const { Schema } = mongoose;

const HomeShowcaseSchema = new Schema(
  {
    heading: { type: String, required: true, trim: true, maxlength: 180 },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
      minlength: 1,
    },
    images: {
      type: [
        {
          url: { type: String, required: true, trim: true },
          publicId: { type: String, required: true, trim: true },
        },
      ],
      default: [],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

HomeShowcaseSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model("home_showcases", HomeShowcaseSchema);
