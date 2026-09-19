const mongoose = require("mongoose");
const { Schema } = mongoose;

const CartItemSchema = new Schema(
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
  },
  { _id: false },
);

const CartSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      default: null,
      sparse: true,
      unique: true,
      index: true,
    },

    sessionId: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      sparse: true,
      unique: true,
      index: true,
    },

    items: {
      type: [CartItemSchema],
      default: [],
    },

    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
  },
  { timestamps: true },
);

CartSchema.pre("validate", function () {
  const hasUser = Boolean(this.userId);
  const hasSession = Boolean(this.sessionId);
  if (hasUser === hasSession) {
    this.invalidate(
      "userId",
      "Cart must have exactly one of userId or sessionId.",
    );
  }
});

CartSchema.pre("save", function () {
  if (this.couponCode) {
    this.couponCode = this.couponCode.trim().toUpperCase();
  }

  this.items = this.items.filter((i) => i.quantity > 0);
});

const Cart = mongoose.model("carts", CartSchema);

module.exports = Cart;
