const mongoose = require("mongoose");
const { Schema } = mongoose;

const AttributeSetSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// auto code
AttributeSetSchema.pre("save", async function () {
  if (!this.code && this.name) {
    this.code = this.name.trim().toLowerCase().replace(/\s+/g, "_");
  }
});

const AttributeSet = mongoose.model("attribute_sets", AttributeSetSchema);

module.exports = AttributeSet;
