import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Container } from "react-bootstrap";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useDispatch } from "react-redux";
import {
  buildCatalogSearchParams,
  getStoreCatalogSearch,
  mapAxiosToStorefrontError,
} from "@src/app/state/actions/publicActions";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import AppPagination from "@src/components/common/AppPagination";
import StorefrontVariantListingGrid from "@src/features/public/components/StorefrontVariantListingGrid";
import { useCatalogPagination } from "@src/hooks/useCatalogPagination";

const SEARCH_INPUT_PLACEHOLDER = "Search our site";

const normalizeCatalogEntries = (rawItems) => {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((row) => ({
      product: row?.product || {},
      variant: row?.variant || null,
    }))
    .filter((row) => row.variant && row.product?.slug);
};

const SearchPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = useMemo(
    () => String(searchParams.get("q") ?? "").trim(),
    [searchParams],
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState([]);
  const [draftQ, setDraftQ] = useState(query);
  const gridAnchorRef = useRef(null);

  const hasSearchQuery = Boolean(query);

  useEffect(() => {
    setDraftQ(query);
  }, [query]);

  const loadSearch = useCallback(async () => {
    if (!hasSearchQuery) {
      setEntries([]);
      setError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = await dispatch(getStoreCatalogSearch({ q: query }));
      setEntries(normalizeCatalogEntries(payload.items));
    } catch (err) {
      const { message } = mapAxiosToStorefrontError(
        err,
        "Something went wrong while loading search results.",
      );
      setError(message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [hasSearchQuery, query, dispatch]);

  useEffect(() => {
    loadSearch();
  }, [loadSearch]);

  const onSubmitSearch = useCallback(
    (e) => {
      e.preventDefault();
      const params = buildCatalogSearchParams({ q: draftQ });
      const qs = params.toString();
      navigate(qs ? `/search?${qs}` : "/search");
    },
    [draftQ, navigate],
  );

  const breadcrumbsTrail = useMemo(() => {
    const home = { label: "Home", link: "/" };
    if (!hasSearchQuery) {
      return [home, { label: "Search our catalog", link: null }];
    }
    if (loading) {
      return [home, { label: "Search results", link: null }];
    }
    const countWord = entries.length === 1 ? "result" : "results";
    return [
      home,
      {
        label: `${entries.length} ${countWord} found for "${query}"`,
        link: null,
      },
    ];
  }, [hasSearchQuery, loading, entries.length, query]);

  const {
    params: paginationParams,
    setParams: setPaginationParams,
    count: paginationCount,
    paginatedEntries,
  } = useCatalogPagination(entries, { resetDeps: [query] });

  const resultsHeading = useMemo(() => {
    if (!hasSearchQuery) return "Find a collection";
    if (loading) return "Searching…";
    return `${entries.length} ${entries.length === 1 ? "result" : "results"} for "${query}"`;
  }, [hasSearchQuery, loading, entries.length, query]);

  return (
    <section className="collection-page search-page">
      <Helmet>
        <title>{query ? `Search — ${query}` : "Search"}</title>
        <meta
          name="description"
          content="Search the catalog by name."
        />
      </Helmet>
      <AppBreadCrumb title="SEARCH" breadcrumbs={breadcrumbsTrail} />

      <Container className="collection-page__container search-page__wrap py-4 py-md-5">
        <p className="search-page__heading">{resultsHeading}</p>

        <form
          className="search-page__bar"
          onSubmit={onSubmitSearch}
          role="search"
          aria-label="Site search"
        >
          <label className="visually-hidden" htmlFor="search-page-q">
            Search the catalog
          </label>
          <input
            id="search-page-q"
            type="search"
            className="search-page__input"
            name="q"
            autoComplete="off"
            placeholder={SEARCH_INPUT_PLACEHOLDER}
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
          />
          <button type="submit" className="search-page__submit">
            Submit
          </button>
        </form>

        {loading ? (
          <BouncingLoader />
        ) : !hasSearchQuery ? (
          <NoRecordsFound
            compact
            title="Looking for something?"
            description="Enter a keyword to search the catalog."
          />
        ) : error ? (
          <NoRecordsFound title="Search unavailable" description={error} />
        ) : entries.length === 0 ? (
          <NoRecordsFound
            title="No matches"
            description="Try another search term."
          />
        ) : (
          <>
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

export default SearchPage;
