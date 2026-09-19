const mongoose = require("mongoose");
const { Schema } = mongoose;

const ClienteleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 180 },
    image: { type: String, required: true, trim: true },
    imagePublicId: { type: String, required: true, trim: true },
    note: { type: String, trim: true, default: "", maxlength: 300 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ClienteleSchema.index({ isActive: 1, order: 1, createdAt: -1 });

module.exports = mongoose.model("clienteles", ClienteleSchema);
