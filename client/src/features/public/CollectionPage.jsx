import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Container } from "react-bootstrap";
import { useParams } from "react-router-dom";

import {
  getStoreProductBySlug,
  mapAxiosToStorefrontError,
} from "@src/app/state/actions/publicActions";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import CollectionPageDescription from "@src/features/public/components/CollectionPageDescription";
import CollectionPageToolbar from "@src/features/public/components/CollectionPageToolbar";
import AppPagination from "@src/components/common/AppPagination";
import StorefrontVariantListingGrid from "@src/features/public/components/StorefrontVariantListingGrid";
import { useCatalogPagination } from "@src/hooks/useCatalogPagination";
import {
  COLLECTION_DEFAULT_SORT,
  filterCollectionEntries,
  cleanCollectionDisplayName,
  pickFilterAttribute,
} from "@src/utils/collectionPageHelpers";

const variantsToEntries = (product, variants) => {
  if (!product?.slug || !Array.isArray(variants)) return [];
  return variants
    .filter((v) => v?._id)
    .map((variant) => ({ product, variant }));
}

const CollectionPage = () => {
  const dispatch = useDispatch();
  const { slug = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);
  const [entries, setEntries] = useState([]);
  const [variantAttributes, setVariantAttributes] = useState([]);
  const [typeFilterValue, setTypeFilterValue] = useState("all");
  const [sortValue, setSortValue] = useState(COLLECTION_DEFAULT_SORT.value);
  const slugRef = useRef(slug);
  const gridAnchorRef = useRef(null);

  useEffect(() => {
    if (!slug) return;

    const slugChanged = slugRef.current !== slug;
    slugRef.current = slug;
    if (slugChanged) {
      setTypeFilterValue("all");
      setSortValue(COLLECTION_DEFAULT_SORT.value);
    }

    const activeSort = slugChanged
      ? COLLECTION_DEFAULT_SORT.value
      : sortValue;

    let cancelled = false;
    const loadCollection = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await dispatch(
          getStoreProductBySlug(slug, { sort: activeSort }),
        );
        if (cancelled) return;
        const nextProduct = payload.product || null;
        const variants = Array.isArray(payload.variants) ? payload.variants : [];
        setProduct(nextProduct);
        setEntries(variantsToEntries(nextProduct, variants));
        setVariantAttributes(
          Array.isArray(payload.variantAttributes)
            ? payload.variantAttributes
            : [],
        );
      } catch (err) {
        if (cancelled) return;
        const { message } = mapAxiosToStorefrontError(
          err,
          "Something went wrong while loading the collection.",
        );
        const friendly =
          err?.response?.status === 404
            ? "We couldn't find this collection."
            : message;
        setError(friendly);
        setProduct(null);
        setEntries([]);
        setVariantAttributes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadCollection();
    return () => {
      cancelled = true;
    };
  }, [slug, sortValue, dispatch]);

  const collectionTitle = cleanCollectionDisplayName(product?.name) || "Collection";
  const productDescription = String(product?.description || "").trim();

  const filterAttribute = useMemo(
    () => pickFilterAttribute(variantAttributes),
    [variantAttributes],
  );

  const filteredEntries = useMemo(
    () =>
      filterCollectionEntries(entries, filterAttribute?.code, typeFilterValue),
    [entries, filterAttribute?.code, typeFilterValue],
  );

  const {
    params: paginationParams,
    setParams: setPaginationParams,
    count: paginationCount,
    paginatedEntries,
  } = useCatalogPagination(filteredEntries, {
    resetDeps: [slug, typeFilterValue, sortValue],
  });

  const breadcrumbs = useMemo(
    () => [
      { label: "Home", link: "/" },
      { label: "Collections", link: "/collections" },
      { label: collectionTitle, link: null },
    ],
    [collectionTitle],
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
      <AppBreadCrumb breadcrumbs={breadcrumbs} />
      {productDescription ? (
        <CollectionPageDescription description={productDescription} />
      ) : null}
      <Container className="collection-page__container py-3 py-md-5">
        {error ? (
          <NoRecordsFound title="Collection unavailable" description={error} />
        ) : entries.length === 0 ? (
          <NoRecordsFound
            title="No variants available"
            description="This collection currently has no published variants."
          />
        ) : (
          <>
            <div className="collection-page__toolbar-wrap">
              <CollectionPageToolbar
                collectionTitle={collectionTitle}
                totalCount={entries.length}
                filteredCount={filteredEntries.length}
                entries={entries}
                filterAttribute={filterAttribute}
                typeFilterValue={typeFilterValue}
                onTypeFilterChange={setTypeFilterValue}
                sortValue={sortValue}
                onSortChange={setSortValue}
              />
            </div>
            {filteredEntries.length === 0 ? (
              <NoRecordsFound
                title="No matching variants"
                description="Try a different type filter or reset sort to see more items."
              />
            ) : (
              <>
                <div ref={gridAnchorRef}>
                  <StorefrontVariantListingGrid entries={paginatedEntries} />
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
          </>
        )}
      </Container>
    </section>
  );
};

export default CollectionPage;
