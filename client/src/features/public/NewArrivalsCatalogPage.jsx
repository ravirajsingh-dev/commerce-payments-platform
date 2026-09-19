import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Container } from "react-bootstrap";
import { Helmet } from "react-helmet-async";

import {
  getStoreCatalogNewArrivals,
  mapAxiosToStorefrontError,
} from "@src/app/state/actions/publicActions";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import CollectionPageToolbar from "@src/features/public/components/CollectionPageToolbar";
import AppPagination from "@src/components/common/AppPagination";
import StorefrontVariantListingGrid from "@src/features/public/components/StorefrontVariantListingGrid";
import { useCatalogPagination } from "@src/hooks/useCatalogPagination";
import {
  COLLECTION_DEFAULT_SORT,
  sortCollectionEntries,
} from "@src/utils/collectionPageHelpers";

const PAGE_TITLE = "New Arrivals";

const normalizeCatalogEntries = (rawItems) => {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((row) => ({
      product: row?.product || {},
      variant: row?.variant || null,
    }))
    .filter((row) => row.variant && row.product?.slug);
}

const NewArrivalsCatalogPage = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState([]);
  const [sortValue, setSortValue] = useState(COLLECTION_DEFAULT_SORT.value);
  const gridAnchorRef = useRef(null);

  const loadNewArrivals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await dispatch(getStoreCatalogNewArrivals());
      setEntries(normalizeCatalogEntries(payload.items));
    } catch (err) {
      const { message } = mapAxiosToStorefrontError(
        err,
        "Something went wrong while loading new arrivals.",
      );
      setError(message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadNewArrivals();
  }, [loadNewArrivals]);

  const sortedEntries = useMemo(
    () => sortCollectionEntries(entries, sortValue),
    [entries, sortValue],
  );

  const {
    params: paginationParams,
    setParams: setPaginationParams,
    count: paginationCount,
    paginatedEntries,
  } = useCatalogPagination(sortedEntries, { resetDeps: [sortValue] });

  const breadcrumbs = useMemo(
    () => [
      { label: "Home", link: "/" },
      { label: PAGE_TITLE, link: null },
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
        <title>{PAGE_TITLE}</title>
        <meta
          name="description"
          content="Shop curated new arrivals from Rajwada."
        />
      </Helmet>
      <AppBreadCrumb breadcrumbs={breadcrumbs} />
      <Container className="collection-page__container py-3 py-md-5">
        {error ? (
          <NoRecordsFound title="Unable to load new arrivals" description={error} />
        ) : entries.length === 0 ? (
          <NoRecordsFound
            title="No new arrivals yet"
            description="New arrivals will appear here when they are marked in the catalog."
          />
        ) : (
          <>
            <div className="collection-page__toolbar-wrap">
              <CollectionPageToolbar
                collectionTitle={PAGE_TITLE}
                totalCount={entries.length}
                filteredCount={sortedEntries.length}
                entries={entries}
                filterAttribute={null}
                typeFilterValue="all"
                onTypeFilterChange={() => {}}
                sortValue={sortValue}
                onSortChange={setSortValue}
                secondaryLink={{
                  to: "/all-variants",
                  label: "View all variants",
                }}
              />
            </div>
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

export default NewArrivalsCatalogPage;
