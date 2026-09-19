const mongoose = require("mongoose");
const { Schema } = mongoose;

const OrderItemSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "orders",
      required: true,
      index: true,
    },

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

    size: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    attributesSnapshot: {
      type: Map,
      of: String,
      default: {},
    },

    productNameSnapshot: {
      type: String,
      required: true,
      trim: true,
    },

    productSlugSnapshot: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    skuSnapshot: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    unitPriceSnapshot: {
      type: Number,
      required: true,
      min: 0,
    },

    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    claimPolicySnapshot: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true },
);

const OrderItem = mongoose.model("order_items", OrderItemSchema);

module.exports = OrderItem;
