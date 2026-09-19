import { useEffect, useMemo, useState } from "react";

import { CATALOG_DEFAULT_PAGE_SIZE } from "@src/constants";

/**
 * Client-side pagination for storefront listing pages.
 * @param {Array} entries — full list after filter/sort
 * @param {{ defaultLimit?: number, resetDeps?: unknown[] }} options
 */
export const useCatalogPagination = (
  entries,
  { defaultLimit = CATALOG_DEFAULT_PAGE_SIZE, resetDeps = [] } = {},
) => {
  const [params, setParams] = useState({
    page: 1,
    limit: defaultLimit,
  });

  const count = Array.isArray(entries) ? entries.length : 0;

  useEffect(() => {
    setParams((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset page when filters/sort/query change
  }, resetDeps);

  const paginatedEntries = useMemo(() => {
    const { page, limit } = params;
    const start = (page - 1) * limit;
    return entries.slice(start, start + limit);
  }, [entries, params.page, params.limit]);

  const totalPages = Math.max(1, Math.ceil(count / params.limit || 1));

  useEffect(() => {
    if (params.page > totalPages) {
      setParams((prev) => ({ ...prev, page: totalPages }));
    }
  }, [params.page, totalPages]);

  const showPagination = count > 0 && totalPages > 1;

  return {
    params,
    setParams,
    count,
    paginatedEntries,
    totalPages,
    showPagination,
  };
}
