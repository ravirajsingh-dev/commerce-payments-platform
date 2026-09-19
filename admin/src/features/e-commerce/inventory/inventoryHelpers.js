export const STOCK_LEVEL_FILTER = {
  ALL: "",
  OUT: "out",
  LOW: "low",
};

export const formatInventoryDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
};

export const filterLowStockItems = (items, appliedFilters = {}) => {
  const sku = String(appliedFilters.sku || "")
    .trim()
    .toUpperCase();
  const productName = String(appliedFilters.productName || "")
    .trim()
    .toLowerCase();
  const stockLevel = String(appliedFilters.stockLevel || "").trim();

  return (items || []).filter((row) => {
    if (sku && !String(row.sku || "").toUpperCase().includes(sku)) {
      return false;
    }
    if (
      productName &&
      !String(row.productName || "").toLowerCase().includes(productName)
    ) {
      return false;
    }
    const stock = Number(row.stock) || 0;
    if (stockLevel === STOCK_LEVEL_FILTER.OUT && stock !== 0) {
      return false;
    }
    if (stockLevel === STOCK_LEVEL_FILTER.LOW && stock === 0) {
      return false;
    }
    return true;
  });
};

export const sortInventoryRows = (rows, orderBy, ascending) => {
  const dir = ascending === "desc" ? -1 : 1;
  const field = orderBy || "stock";

  return [...rows].sort((a, b) => {
    const left = a[field];
    const right = b[field];
    if (typeof left === "number" && typeof right === "number") {
      return (left - right) * dir;
    }
    return String(left || "").localeCompare(String(right || "")) * dir;
  });
};

export const paginateRows = (rows, page = 1, limit = 20) => {
  const safeLimit = Math.max(1, Number(limit) || 20);
  const safePage = Math.max(1, Number(page) || 1);
  const start = (safePage - 1) * safeLimit;
  return rows.slice(start, start + safeLimit);
};

export const buildLowStockSummary = (items, threshold) => {
  const list = items || [];
  const outOfStock = list.filter((row) => (Number(row.stock) || 0) === 0).length;
  const inStockLow = list.filter((row) => {
    const stock = Number(row.stock) || 0;
    return stock > 0 && stock <= (Number(threshold) || 0);
  }).length;

  return {
    total: list.length,
    outOfStock,
    inStockLow,
    threshold: threshold ?? "—",
  };
};
