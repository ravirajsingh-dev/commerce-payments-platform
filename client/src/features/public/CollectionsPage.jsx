import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Container } from "react-bootstrap";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

import {
  getStoreCatalogProducts,
  mapAxiosToStorefrontError,
} from "@src/app/state/actions/publicActions";
import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import AppPagination from "@src/components/common/AppPagination";
import { useCatalogPagination } from "@src/hooks/useCatalogPagination";

const CollectionsPage = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const gridAnchorRef = useRef(null);

  const {
    params: paginationParams,
    setParams: setPaginationParams,
    count: paginationCount,
    paginatedEntries: paginatedItems,
  } = useCatalogPagination(items);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await dispatch(getStoreCatalogProducts());
        if (cancelled) return;
        setItems(Array.isArray(payload.products) ? payload.products : []);
      } catch (err) {
        if (cancelled) return;
        const { message } = mapAxiosToStorefrontError(
          err,
          "Something went wrong while loading collections.",
        );
        setError(message);
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return (
    <section className="collections-catalog">
      <Helmet>
        <title>Collections</title>
        <meta
          name="description"
          content="Browse all collections — luxury silhouettes, tailoring, and occasion wear."
        />
      </Helmet>

      <AppBreadCrumb
        breadcrumbs={[
          { label: "Home", link: "/" },
          { label: "Collections" },
        ]}
      />

      <Container fluid="xxl" className="collections-catalog__inner">
        {loading ? (
          <BouncingLoader />
        ) : error ? (
          <NoRecordsFound title="Collections unavailable" description={error} />
        ) : items.length === 0 ? (
          <NoRecordsFound
            title="No collections yet"
            description="Published collections will appear here once they are available in the catalog."
          />
        ) : (
          <>
          <div ref={gridAnchorRef} className="collections-catalog__grid">
            {paginatedItems.map((row, index) => {
              const slug = String(row.slug || "").trim();
              const name = String(row.name || "").trim() || slug;
              const thumb = row.coverImage?.url || "";
              const count = Math.max(0, Number(row.variantCount) || 0);
              const countLabel = `${count} product${count === 1 ? "" : "s"}`;
              const to = `/collection/${encodeURIComponent(slug)}`;

              return (
                <Link
                  key={slug ? `collection-${slug}` : `collection-${index}`}
                  to={to}
                  className="collections-catalog__card"
                >
                  <div className="collections-catalog__media" aria-hidden>
                    {thumb ? (
                      <div
                        className="collections-catalog__media-bg"
                        style={{
                          backgroundImage: `url(${encodeURI(thumb)})`,
                        }}
                      />
                    ) : (
                      <span className="collections-catalog__media-placeholder">
                        {name}
                      </span>
                    )}
                  </div>
                  <h2 className="collections-catalog__name">{name}</h2>
                  <p className="collections-catalog__count">{countLabel}</p>
                </Link>
              );
            })}
          </div>
          <AppPagination
            variant="catalog"
            className="collection-page__pagination"
            params={paginationParams}
            setParams={setPaginationParams}
            count={paginationCount}
            scrollTargetRef={gridAnchorRef}
            summaryUnit="collections"
          />
          </>
        )}
      </Container>
    </section>
  );
};

export default CollectionsPage;
