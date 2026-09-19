const getNextSortOrder = async (Model) => {
  const last = await Model.findOne().sort({ sortOrder: -1 });
  return last ? last.sortOrder + 1 : 1;
};

module.exports = {
  getNextSortOrder,
};
