const mongoose = require("mongoose");
const { Schema } = mongoose;

const ProductSchema = new Schema(
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

    primaryCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "categories",
      required: true,
      index: true,
    },

    categoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "categories",
      },
    ],

    attributeSetId: {
      type: Schema.Types.ObjectId,
      ref: "attribute_sets",
      required: true,
      index: true,
    },

    attributes: {
      type: Schema.Types.Mixed,
      default: {},
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    /** Shown on the storefront before the stock status (e.g. shipping timelines). */
    deliveryDescription: {
      type: String,
      trim: true,
      default: "",
    },

    /** Shown below stock on the product detail page (e.g. what is included in the purchase). */
    purchaseNote: {
      type: String,
      trim: true,
      default: "",
    },

    seo: {
      metaTitle: {
        type: String,
        trim: true,
        default: "",
      },
      metaDescription: {
        type: String,
        trim: true,
        default: "",
      },
      metaKeywords: {
        type: [String],
        default: [],
      },
    },

    searchKeywords: [{ type: String }],

    /**
     * Optional, admin-managed size chart shared by every variant of this product.
     *
     *   sizeChart: {
     *     sizes: [{ value: "s", label: "S" }, ...]            // columns
     *     rows:  [{ code, label: "LENGTH", values: { s: 116.84, ... } }, ...]
     *   }
     *
     * Stored values are always in CENTIMETRES — the storefront flips the unit.
     * Products that don't need a chart (e.g. belts, pocket squares) keep the
     * default `{ sizes: [], rows: [] }` and no link is shown on the storefront.
     */
    sizeChart: {
      type: {
        sizes: [
          {
            value: { type: String, trim: true, lowercase: true, default: "" },
            label: { type: String, trim: true, default: "" },
            _id: false,
          },
        ],
        rows: [
          {
            code: { type: String, trim: true, lowercase: true, default: "" },
            label: { type: String, trim: true, required: true, maxlength: 80 },
            values: { type: Map, of: Number, default: {} },
            _id: false,
          },
        ],
      },
      default: () => ({ sizes: [], rows: [] }),
    },

    status: {
      type: Number,
      enum: [1, 2, 3], // active, draft, inactive
      default: 1,
    },

    claimPolicyId: {
      type: Schema.Types.ObjectId,
      ref: "claim_policies",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

// indexes
ProductSchema.index({ categoryIds: 1 });
ProductSchema.index({ status: 1, createdAt: -1 });

// 🔥 CLEAN + CONSISTENCY
ProductSchema.pre("save", function () {
  // slug normalize
  if (this.slug) {
    this.slug = this.slug.trim().toLowerCase().replace(/\s+/g, "-");
  }

  // ensure primary category included
  if (
    this.primaryCategoryId &&
    !this.categoryIds.includes(this.primaryCategoryId)
  ) {
    this.categoryIds.push(this.primaryCategoryId);
  }

  // normalize keywords
  if (this.searchKeywords?.length) {
    this.searchKeywords = this.searchKeywords.map((k) =>
      k.trim().toLowerCase(),
    );
  }

  // SEO auto-generation without overriding user-provided values
  if (!this.seo) this.seo = {};

  if (!this.seo.metaTitle && this.name) {
    this.seo.metaTitle = this.name.trim();
  }

  if (!this.seo.metaDescription && this.description) {
    this.seo.metaDescription = this.description.substring(0, 150).trim();
  }

  if (!this.seo.metaKeywords || this.seo.metaKeywords.length === 0) {
    if (this.name) {
      this.seo.metaKeywords = this.name
        .toLowerCase()
        .split(" ")
        .filter(Boolean);
    }
  }
});

const Product = mongoose.model("products", ProductSchema);

module.exports = Product;
