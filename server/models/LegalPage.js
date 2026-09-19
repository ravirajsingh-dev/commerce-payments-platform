const mongoose = require("mongoose");
const { Schema } = mongoose;
const { LEGAL_PAGE_SLUGS, isLegalPageSlug } = require("../shared/constants/legalPages");

const LegalSectionSchema = new Schema(
  {
    heading: { type: String, default: "", trim: true },
    text: { type: String, default: "" },
  },
  { _id: false },
);

const LegalPageSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: [...LEGAL_PAGE_SLUGS],
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    /** Multiple blocks: heading + plain text (no HTML). */
    sections: {
      type: [LegalSectionSchema],
      default: [],
    },
    /** @deprecated Legacy single blob; kept for reads until re-saved. */
    bodyText: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

let LegalPage;

LegalPageSchema.statics.ensureAllPages = async () => {
  for (const slug of LEGAL_PAGE_SLUGS) {
    await LegalPage.updateOne(
      { slug },
      { $setOnInsert: { slug, title: "", sections: [], bodyText: "" } },
      { upsert: true },
    );
  }
};

LegalPageSchema.statics.assertSlug = (slug) => {
  if (!isLegalPageSlug(slug)) {
    const err = new Error("INVALID_LEGAL_PAGE_SLUG");
    err.code = "INVALID_LEGAL_PAGE_SLUG";
    throw err;
  }
};

LegalPage = mongoose.model("LegalPage", LegalPageSchema);

module.exports = LegalPage;
