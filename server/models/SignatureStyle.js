const mongoose = require("mongoose");
const { Schema } = mongoose;

const SignatureStyleSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    subtitle: { type: String, trim: true, default: "", maxlength: 300 },
    image: { type: String, required: true, trim: true },
    imagePublicId: { type: String, required: true, trim: true },
    /** Catalog product whose collection page this tile opens (`/collection/:slug`). */
    productId: {
      type: Schema.Types.ObjectId,
      ref: "products",
      index: true,
    },
    routePath: { type: String, required: true, trim: true, maxlength: 250 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

SignatureStyleSchema.index({ isActive: 1, order: 1, createdAt: -1 });

module.exports = mongoose.model("signature_styles", SignatureStyleSchema);
