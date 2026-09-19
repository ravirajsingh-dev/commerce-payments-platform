import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Container } from "react-bootstrap";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";

import {
  getStoreCategoryVariants,
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

const CategoryVariantsPage = () => {
  const dispatch = useDispatch();
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState(null);
  const [entries, setEntries] = useState([]);
  const gridAnchorRef = useRef(null);

  const loadCategoryVariants = useCallback(async () => {
    const categorySlug = String(slug || "").trim();
    if (!categorySlug) {
      setCategory(null);
      setEntries([]);
      setError("Category not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = await dispatch(getStoreCategoryVariants(categorySlug));
      setCategory(payload?.category || null);
      setEntries(normalizeCatalogEntries(payload?.items));
    } catch (err) {
      const { message, status } = mapAxiosToStorefrontError(
        err,
        "Something went wrong while loading variants.",
      );
      setError(status === 404 ? "Category not found." : message);
      setCategory(null);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [slug, dispatch]);

  useEffect(() => {
    loadCategoryVariants();
  }, [loadCategoryVariants]);

  const {
    params: paginationParams,
    setParams: setPaginationParams,
    count: paginationCount,
    paginatedEntries,
  } = useCatalogPagination(entries);

  const categoryName = String(category?.name || "").trim() || "Category";

  const breadcrumbs = useMemo(
    () => [
      { label: "Home", link: "/" },
      { label: "Collections", link: "/collections" },
      { label: categoryName, link: null },
    ],
    [categoryName],
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
        <title>{categoryName}</title>
        <meta
          name="description"
          content={`Browse all published variants in ${categoryName}.`}
        />
      </Helmet>
      <AppBreadCrumb breadcrumbs={breadcrumbs} />
      <Container className="collection-page__container py-4 py-md-5">
        {error ? (
          <NoRecordsFound title="Unable to load category" description={error} />
        ) : entries.length === 0 ? (
          <NoRecordsFound
            title="No variants available"
            description={`There are no published variants in ${categoryName} yet.`}
          />
        ) : (
          <>
            <header className="collection-page__head collection-page__head--split-links">
              <p className="collection-page__variant-count mb-0">
                {entries.length}{" "}
                {entries.length === 1 ? "variant" : "variants"} in {categoryName}
              </p>
              <div className="collection-page__head-links">
                <Link
                  to="/collections"
                  className="collection-page__all-variants-link"
                >
                  Browse collections
                </Link>
                <Link
                  to="/all-variants"
                  className="collection-page__all-variants-link"
                >
                  View all variants
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

export default CategoryVariantsPage;
