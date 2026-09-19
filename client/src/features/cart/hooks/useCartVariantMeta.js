import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";

import { getStoreVariantDetail } from "@src/app/state/actions/publicActions";

/**
 * Loads storefront variant + product metadata for cart line display.
 */
const useCartVariantMeta = (items = []) => {
  const dispatch = useDispatch();
  const variantIdsKey = useMemo(() => {
    const ids = [
      ...new Set(
        (items || [])
          .map((row) => String(row.variantId || "").trim())
          .filter(Boolean),
      ),
    ];
    ids.sort();
    return ids.join(",");
  }, [items]);

  const variantIds = useMemo(
    () => (variantIdsKey ? variantIdsKey.split(",") : []),
    [variantIdsKey],
  );

  const [metaByVariantId, setMetaByVariantId] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (variantIds.length === 0) {
      setMetaByVariantId((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setLoading((prev) => (prev ? false : prev));
      return undefined;
    }

    const load = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          variantIds.map(async (id) => {
            const result = await dispatch(getStoreVariantDetail(id));
            if (result?.status && result.data) {
              return [id, result.data];
            }
            return [id, { variant: null, product: null }];
          }),
        );

        if (cancelled) return;
        setMetaByVariantId(Object.fromEntries(results));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [variantIdsKey, variantIds, dispatch]);

  return { metaByVariantId, loadingMeta: loading };
};

export default useCartVariantMeta;
