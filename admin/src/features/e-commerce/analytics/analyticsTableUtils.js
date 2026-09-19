import { useMemo } from "react";

const compareValues = (a, b, ascending) => {
  const dir = ascending === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") {
    return (a - b) * dir;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true }) * dir;
};

/**
 * Client-side sort + pagination for dashboard tables (CustomDataTable).
 */
export const useClientTableSlice = (rows = [], params = {}, defaultSort = {}) => {
  return useMemo(() => {
    const list = Array.isArray(rows) ? [...rows] : [];
    const orderBy = params.orderBy || defaultSort.orderBy || "";
    const ascending = params.ascending ?? defaultSort.ascending ?? "desc";

    if (orderBy) {
      list.sort((left, right) =>
        compareValues(left[orderBy], right[orderBy], ascending),
      );
    }

    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const start = (page - 1) * limit;

    return {
      data: list.slice(start, start + limit),
      count: list.length,
    };
  }, [rows, params.page, params.limit, params.orderBy, params.ascending, defaultSort]);
};
