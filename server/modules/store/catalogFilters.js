const parseCatalogSearchQuery = (query = {}) => ({
  ok: true,
  q: String(query.q ?? "").trim(),
});

module.exports = {
  parseCatalogSearchQuery,
};
