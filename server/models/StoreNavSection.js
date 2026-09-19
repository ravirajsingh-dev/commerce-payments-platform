const mongoose = require("mongoose");
const { Schema } = mongoose;

const StoreNavSectionSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    columnIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      default: 0,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    status: {
      type: Number,
      enum: [1, 2],
      default: 1,
    },
    productIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "products",
      },
    ],
  },
  { timestamps: true },
);

StoreNavSectionSchema.index({ columnIndex: 1, sortOrder: 1 });

const StoreNavSection = mongoose.model("store_nav_sections", StoreNavSectionSchema);

module.exports = StoreNavSection;
