import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Container } from "react-bootstrap";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

import {
  getStoreCatalogAllVariants,
  mapAxiosToStorefrontError,
} from "@src/app/state/actions/publicActions";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import AppPagination from "@src/components/common/AppPagination";
import StorefrontVariantListingGrid from "@src/features/public/components/StorefrontVariantListingGrid";
import { useCatalogPagination } from "@src/hooks/useCatalogPagination";

const normalizeCatalogEntries = (rawItems) => {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((row) => ({
      product: row?.product || {},
      variant: row?.variant || null,
    }))
    .filter((row) => row.variant && row.product?.slug);
}

const AllVariantsCatalogPage = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState([]);
  const gridAnchorRef = useRef(null);

  const loadCatalogVariants = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await dispatch(getStoreCatalogAllVariants());
      setEntries(normalizeCatalogEntries(payload.items));
    } catch (err) {
      const { message } = mapAxiosToStorefrontError(
        err,
        "Something went wrong while loading variants.",
      );
      setError(message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadCatalogVariants();
  }, [loadCatalogVariants]);

  const {
    params: paginationParams,
    setParams: setPaginationParams,
    count: paginationCount,
    paginatedEntries,
  } = useCatalogPagination(entries);

  const breadcrumbs = useMemo(
    () => [
      { label: "Home", link: "/" },
      { label: "Collections", link: "/collections" },
      { label: "All variants", link: null },
    ],
    [],
  );

  if (loading) {
    return (
      <section className="collection-page">
        <BouncingLoader />
      </section>
    );
  }

  return (
    <section className="collection-page">
      <Helmet>
        <title>All variants</title>
        <meta
          name="description"
          content="Browse every published variant across all collections."
        />
      </Helmet>
      <AppBreadCrumb breadcrumbs={breadcrumbs} />
      <Container className="collection-page__container py-4 py-md-5">
        {error ? (
          <NoRecordsFound title="Unable to load variants" description={error} />
        ) : entries.length === 0 ? (
          <NoRecordsFound
            title="No variants available"
            description="Published variants will appear here when they are live in the catalog."
          />
        ) : (
          <>
            <header className="collection-page__head collection-page__head--split-links">
              <p className="collection-page__variant-count mb-0">
                {entries.length}{" "}
                {entries.length === 1 ? "variant" : "variants"} across all
                collections
              </p>
              <div className="collection-page__head-links">
                <Link
                  to="/new-arrivals"
                  className="collection-page__all-variants-link"
                >
                  New arrivals
                </Link>
                <Link
                  to="/collections"
                  className="collection-page__all-variants-link"
                >
                  Browse collections
                </Link>
              </div>
            </header>
            <div ref={gridAnchorRef}>
              <StorefrontVariantListingGrid
                entries={paginatedEntries}
                showCollectionLabel
              />
            </div>
            <AppPagination
              variant="catalog"
              className="collection-page__pagination"
              params={paginationParams}
              setParams={setPaginationParams}
              count={paginationCount}
              scrollTargetRef={gridAnchorRef}
            />
          </>
        )}
      </Container>
    </section>
  );
};

export default AllVariantsCatalogPage;
