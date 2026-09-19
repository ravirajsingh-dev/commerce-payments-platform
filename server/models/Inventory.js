const mongoose = require("mongoose");
const { Schema } = mongoose;

const InventorySchema = new Schema(
  {
    productVariantId: {
      type: Schema.Types.ObjectId,
      ref: "product_variants",
      unique: true,
      required: true,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

const Inventory = mongoose.model("inventory", InventorySchema);

module.exports = Inventory;
