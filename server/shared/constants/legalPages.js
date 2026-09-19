/**
 * URL slug segment (matches client routes: /returns-and-refunds, etc.)
 */
const LEGAL_PAGE_SLUGS = Object.freeze([
  "returns-and-refunds",
  "privacy-policy",
  "terms-and-conditions",
]);

const isLegalPageSlug = (value) =>
  typeof value === "string" && LEGAL_PAGE_SLUGS.includes(value);

module.exports = {
  LEGAL_PAGE_SLUGS,
  isLegalPageSlug,
};
