const mongoose = require("mongoose");
const { Schema } = mongoose;
const { generateSlug } = require("../shared/utils/generateSlug");

const CategorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    parentCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "categories",
      default: null,
      index: true,
    },

    ancestors: [
      {
        type: Schema.Types.ObjectId,
        ref: "categories",
      },
    ],

    status: {
      type: Number,
      enum: [1, 2],
      default: 1,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

CategorySchema.index({ parentCategoryId: 1, sortOrder: 1 });

CategorySchema.pre("save", async function () {
  if (!this.slug && this.name) {
    this.slug = generateSlug(this.name);
  } else if (this.slug) {
    this.slug = generateSlug(this.slug);
  }

  if (!this.parentCategoryId) {
    this.ancestors = [];
    return;
  }

  const parent = await this.constructor.findById(this.parentCategoryId);
  this.ancestors = parent ? [...parent.ancestors, parent._id] : [];
});

const Category = mongoose.model("categories", CategorySchema);

module.exports = Category;
