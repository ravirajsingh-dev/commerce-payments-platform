const mongoose = require("mongoose");
const { Schema } = mongoose;

const WishlistItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "products",
      required: true,
    },
    productVariantId: {
      type: Schema.Types.ObjectId,
      ref: "product_variants",
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const WishlistSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [WishlistItemSchema],
      default: [],
    },
  },
  { timestamps: true },
);

const Wishlist = mongoose.model("wishlists", WishlistSchema);

module.exports = Wishlist;
