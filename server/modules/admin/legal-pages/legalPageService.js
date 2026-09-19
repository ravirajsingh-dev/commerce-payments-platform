const LegalPage = require("../../../models/LegalPage");
const { LEGAL_PAGE_SLUGS } = require("../../../shared/constants/legalPages");

const MAX_SECTION_TEXT = 120_000;
const MAX_HEADING = 500;
const MAX_SECTIONS = 200;

const stripAngleBrackets = (s) => {
  if (!s || typeof s !== "string") return "";
  return s.replace(/[<>]/g, "");
};

/** Legacy blocks → not used on write anymore */
const blocksToPlainText = (blocks) => {
  if (!Array.isArray(blocks)) return "";
  const parts = [];
  for (const b of blocks) {
    if (!b || !b.type) continue;
    switch (b.type) {
      case "heading":
        parts.push("", String(b.text || "").trim(), "");
        break;
      case "paragraph":
        parts.push(String(b.text || "").trim(), "");
        break;
      default:
        break;
    }
  }
  return parts.join("\n").trim();
};

const normalizeBodyText = (raw) => {
  if (raw === undefined || raw === null) return "";
  let s = stripAngleBrackets(String(raw));
  if (s.length > MAX_SECTION_TEXT) s = s.slice(0, MAX_SECTION_TEXT);
  return s.replace(/\r\n/g, "\n").trimEnd();
};

const normalizeSections = (raw) => {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    let heading = stripAngleBrackets(String(row.heading ?? "").trim());
    let text = normalizeBodyText(row.text ?? "");
    if (heading.length > MAX_HEADING) heading = heading.slice(0, MAX_HEADING);
    if (!heading && !text.trim()) continue;
    out.push({ heading, text });
    if (out.length >= MAX_SECTIONS) break;
  }
  return out;
};

/** Build sections for API when DB has only legacy bodyText/blocks. */
const resolveSections = (o) => {
  let sections = Array.isArray(o.sections) ? o.sections : [];
  if (sections.length) {
    return sections.map((s) => ({
      heading: stripAngleBrackets(String(s.heading ?? "").trim()).slice(0, MAX_HEADING),
      text: normalizeBodyText(s.text ?? ""),
    }));
  }
  const legacyText = normalizeBodyText(o.bodyText ?? "");
  if (legacyText) {
    return [{ heading: "", text: legacyText }];
  }
  if (Array.isArray(o.blocks) && o.blocks.length) {
    const flat = blocksToPlainText(o.blocks);
    if (flat) return [{ heading: "", text: flat }];
  }
  return [];
};

const toPublicShape = (doc) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const sections = resolveSections(o);
  return {
    slug: o.slug,
    title: o.title || "",
    sections,
    updatedAt: o.updatedAt || null,
  };
};

const ensureAllPages = async () => {
  await LegalPage.ensureAllPages();
};

const listAll = async () => {
  await ensureAllPages();
  const rows = await LegalPage.find({ slug: { $in: [...LEGAL_PAGE_SLUGS] } })
    .sort({ slug: 1 })
    .lean();
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return LEGAL_PAGE_SLUGS.map((slug) => {
    const row = bySlug.get(slug);
    return toPublicShape(row || { slug, title: "", sections: [] });
  });
};

const getBySlugPublic = async (slug) => {
  LegalPage.assertSlug(slug);
  await ensureAllPages();
  const doc = await LegalPage.findOne({ slug }).lean();
  return toPublicShape(doc || { slug, title: "", sections: [] });
};

const getBySlugAdmin = async (slug) => {
  LegalPage.assertSlug(slug);
  await ensureAllPages();
  const doc = await LegalPage.findOne({ slug }).lean();
  return toPublicShape(doc || { slug, title: "", sections: [] });
};

const updateBySlug = async (slug, { title, sections }) => {
  LegalPage.assertSlug(slug);
  await ensureAllPages();
  const safeTitle =
    title === undefined || title === null ? "" : stripAngleBrackets(String(title).trim());
  const safeSections = normalizeSections(sections);
  const doc = await LegalPage.findOneAndUpdate(
    { slug },
    {
      $set: { title: safeTitle, sections: safeSections, bodyText: "" },
      $unset: { blocks: "", bodyHtml: "" },
    },
    { returnDocument: "after", runValidators: true },
  ).lean();
  return toPublicShape(doc);
};

module.exports = {
  ensureAllPages,
  listAll,
  getBySlugPublic,
  getBySlugAdmin,
  updateBySlug,
  normalizeSections,
};
