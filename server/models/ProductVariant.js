const mongoose = require("mongoose");
const { Schema } = mongoose;

const ProductVariantSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "products",
      required: true,
      index: true,
    },

    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    /**
     * Storefront-friendly marketing label for this specific variant ("look").
     * Optional — admin can leave blank and the parent product name is used as fallback.
     */
    name: {
      type: String,
      trim: true,
      default: "",
      maxlength: 180,
    },

    /**
     * Short marketing blurb shown beneath the name on the variant card and detail page.
     */
    shortDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    attributes: {
      type: Map,
      of: String,
      required: true,
    },

    attributeFingerprint: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    /** Optional storefront discount — flat ₹ off or percentage off list `price`. */
    discountType: {
      type: String,
      enum: ["percentage", "flat", null],
      default: null,
    },

    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
    },

    /** When true, variant appears on the storefront "New Arrivals" page (admin-curated). */
    isNewArrival: {
      type: Boolean,
      default: false,
      index: true,
    },

    images: {
      type: [
        {
          url: {
            type: String,
            required: true,
            trim: true,
          },
          publicId: {
            type: String,
            required: true,
            trim: true,
          },
        },
      ],
      default: [],
    },

    /**
     * Stockable sizes for this variant. The size axis lives here (not under `attributes`) so the
     * variant document represents a single "look" (color/fabric combination) with multiple sizes,
     * each having its own stock. When `sizes` is empty, the variant has no size axis and falls
     * back to the legacy single-stock inventory row.
     */
    sizes: {
      type: [
        {
          value: { type: String, required: true, trim: true, lowercase: true },
          label: { type: String, required: true, trim: true },
          sku: { type: String, trim: true, default: "" },
          stock: { type: Number, required: true, min: 0, default: 0 },
          /** Shown on storefront size hover (e.g. measurements). Admin-managed. */
          description: { type: String, trim: true, default: "", maxlength: 500 },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

// Look up all variants of a product fast even when filtering by stock axis
ProductVariantSchema.index({ productId: 1, "sizes.value": 1 });

// Non-unique: multiple variant rows per product may share the same shade/type fingerprint
// (different SKUs, pricing, images, etc.); uniqueness is enforced on `sku` only.
ProductVariantSchema.index({ productId: 1, attributeFingerprint: 1 });

/**
 * Reads key/value pairs from whatever Mongoose gives us for a Map field:
 * native Map, Mongoose Map-like (forEach), or plain object after cast.
 */
const getAttributesEntries = (attrs) => {
  if (attrs == null) return [];
  if (attrs instanceof Map) {
    return Array.from(attrs.entries());
  }
  if (typeof attrs.forEach === "function" && typeof attrs.get === "function") {
    const pairs = [];
    attrs.forEach((value, key) => {
      pairs.push([key, value]);
    });
    return pairs;
  }
  if (typeof attrs === "object") {
    return Object.entries(attrs);
  }
  return [];
};

/**
 * Stable fingerprint for uniqueness — must match index semantics.
 * Exported so services can set this before create/update when middleware is bypassed.
 */
const computeAttributeFingerprint = (attrs) => {
  const pairs = getAttributesEntries(attrs);
  if (pairs.length === 0) {
    // Default/simple product variant marker (non-empty for required String validation)
    return "__default__";
  }
  const sorted = [...pairs].sort(([a], [b]) => String(a).localeCompare(String(b)));
  return sorted
    .map(([k, v]) => `${String(k)}:${String(v ?? "").trim()}`)
    .join("|");
};

/**
 * REQUIRED runs before `save` middleware. Previously `attributeFingerprint` was filled in
 * `pre('save')`, which runs *after* validation — so `required` failed every time.
 */
ProductVariantSchema.pre("validate", function () {
  if (this.attributes != null) {
    this.attributeFingerprint = computeAttributeFingerprint(this.attributes);
  }
});

const ProductVariant = mongoose.model("product_variants", ProductVariantSchema);

ProductVariant.computeAttributeFingerprint = computeAttributeFingerprint;

module.exports = ProductVariant;
