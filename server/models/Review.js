const mongoose = require("mongoose");
const { Schema } = mongoose;

const ReviewSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "products",
      required: true,
      index: true,
    },

    productVariantId: {
      type: Schema.Types.ObjectId,
      ref: "product_variants",
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    title: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    comment: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1500,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true },
);

ReviewSchema.index(
  {
    productVariantId: 1,
    userId: 1,
  },
  { unique: true },
);

ReviewSchema.index({
  productId: 1,
  status: 1,
  createdAt: -1,
});

const Review = mongoose.model("reviews", ReviewSchema);

module.exports = Review;
