const mongoose = require("mongoose");
const { Schema } = mongoose;

const AttributeSchema = new Schema(
  {
    attributeSetId: {
      type: Schema.Types.ObjectId,
      ref: "attribute_sets",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    inputType: {
      type: String,
      enum: ["text", "number", "select", "boolean"],
      default: "text",
    },

    isRequired: {
      type: Boolean,
      default: false,
    },

    isFilterable: {
      type: Boolean,
      default: false,
    },

    isVariant: {
      type: Boolean,
      default: false,
    },

    options: [
      {
        label: {
          type: String,
          trim: true,
        },
        value: {
          type: String,
          trim: true,
        },
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// indexes
AttributeSchema.index({ attributeSetId: 1, code: 1 }, { unique: true });
AttributeSchema.index({ attributeSetId: 1, isFilterable: 1 });

// clean data
AttributeSchema.pre("save", async function () {
  if (this.code) {
    this.code = this.code.trim().toLowerCase();
  }

  if (this.inputType !== "select") {
    this.options = [];
  }
});

const Attribute = mongoose.model("attributes", AttributeSchema);

module.exports = Attribute;
