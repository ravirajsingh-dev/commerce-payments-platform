const STOCK_ADJUSTMENT_REASONS = [
  "receiving",
  "cycle_count",
  "damage",
  "correction",
  "return",
  "other",
];

const STOCK_ADJUSTMENT_REASON_LABELS = {
  receiving: "Stock received",
  cycle_count: "Cycle count",
  damage: "Damaged / write-off",
  correction: "Data correction",
  return: "Return to stock",
  other: "Other",
};

module.exports = {
  STOCK_ADJUSTMENT_REASONS,
  STOCK_ADJUSTMENT_REASON_LABELS,
};
