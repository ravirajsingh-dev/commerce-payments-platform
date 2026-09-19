import { useCallback, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Container } from "react-bootstrap";
import { Link, Navigate } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import AppPagination from "@src/components/common/AppPagination";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import { addToCart } from "@src/features/cart/cartActions";
import { useCatalogPagination } from "@src/hooks/useCatalogPagination";
import WishlistItemCard from "./components/WishlistItemCard";
import { fetchWishlist, removeFromWishlist } from "./wishlistActions";

const breadcrumbs = [
  { label: "Home", link: "/" },
  { label: "My Account", link: "/user/my-account" },
  { label: "Wishlist", link: null },
];

const EMPTY_ITEMS = [];
const WISHLIST_PAGE_SIZE = 10;

const WishlistPage = ({
  auth: { isAuthenticated, loading: authLoading },
  wishlist: { wishlist, loading },
  fetchWishlist,
  removeFromWishlist,
  addToCart,
}) => {
  const [removingVariantId, setRemovingVariantId] = useState(null);
  const [addingVariantId, setAddingVariantId] = useState(null);
  const [selectedSizes, setSelectedSizes] = useState({});
  const listRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated, fetchWishlist]);

  const items = wishlist?.items ?? EMPTY_ITEMS;
  const itemCount = wishlist?.itemCount ?? items.length;

  const {
    params: paginationParams,
    setParams: setPaginationParams,
    count: paginationCount,
    paginatedEntries,
    showPagination,
  } = useCatalogPagination(items, {
    defaultLimit: WISHLIST_PAGE_SIZE,
    resetDeps: [wishlist?.updatedAt, items.length],
  });

  useEffect(() => {
    if (!items.length) {
      setSelectedSizes({});
      return;
    }
    setSelectedSizes((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        if (!item.requiresSize) return;
        const preferred = String(item.defaultSize || "").trim().toLowerCase();
        const current = String(next[item.variantId] || "").trim().toLowerCase();
        const stillValid = (item.sizeOptions || []).some(
          (row) => row.value === current && row.stock > 0,
        );
        if (stillValid) return;
        const preferredValid = (item.sizeOptions || []).some(
          (row) => row.value === preferred && row.stock > 0,
        );
        const fallback =
          (item.sizeOptions || []).find((row) => row.stock > 0)?.value || "";
        next[item.variantId] = preferredValid
          ? preferred
          : fallback || preferred;
      });
      return next;
    });
  }, [items]);

  const handleSizeChange = useCallback((variantId, size) => {
    setSelectedSizes((prev) => ({ ...prev, [variantId]: size }));
  }, []);

  const handleRemove = useCallback(
    async (item) => {
      setRemovingVariantId(item.variantId);
      try {
        await removeFromWishlist(item.variantId);
      } finally {
        setRemovingVariantId(null);
      }
    },
    [removeFromWishlist],
  );

  const handleAddToCart = useCallback(
    async (item, size = "") => {
      if (item.requiresSize && !size) return;
      setAddingVariantId(item.variantId);
      try {
        const cart = await addToCart({
          variantId: item.variantId,
          qty: 1,
          ...(item.requiresSize ? { size } : {}),
        });
        if (cart) {
          await removeFromWishlist(item.variantId, { silent: true });
        }
      } finally {
        setAddingVariantId(null);
      }
    },
    [addToCart, removeFromWishlist],
  );

  if (authLoading || isAuthenticated === null) {
    return (
      <section className="cart-page wishlist-page">
        <BouncingLoader minHeight="280px" />
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: "/user/wishlist" }} replace />;
  }

  const showLoader = loading;
  const isEmpty = !loading && items.length === 0;

  return (
    <section className="cart-page wishlist-page">
      <AppBreadCrumb breadcrumbs={breadcrumbs} />
      <Container className="cart-page__container">
        {!showLoader && !isEmpty && itemCount > 0 ? (
          <p className="cart-page__count wishlist-page__lead">
            {itemCount} {itemCount === 1 ? "item" : "items"} saved — move them to
            your cart when you are ready.
          </p>
        ) : null}

        {showLoader ? (
          <BouncingLoader minHeight="280px" />
        ) : isEmpty ? (
          <div className="cart-page__empty">
            <NoRecordsFound
              title="Your wishlist is empty"
              description="Save favourites from any product page to find them here."
            />
            <Link to="/collections" className="btn btn--theme cart-page__empty-btn">
              Browse collections
            </Link>
          </div>
        ) : (
          <div className="cart-page__layout cart-page__layout--wishlist">
            <div ref={listRef} className="cart-page__lines-panel">
              <div className="cart-page__lines">
                {paginatedEntries.map((item) => (
                  <WishlistItemCard
                    key={item.variantId}
                    item={item}
                    selectedSize={
                      selectedSizes[item.variantId] || item.defaultSize || ""
                    }
                    onSizeChange={handleSizeChange}
                    onRemove={handleRemove}
                    onAddToCart={handleAddToCart}
                    removing={String(removingVariantId) === String(item.variantId)}
                    adding={String(addingVariantId) === String(item.variantId)}
                  />
                ))}
              </div>

              {showPagination ? (
                <AppPagination
                  variant="table"
                  className="wishlist-page__pagination"
                  params={paginationParams}
                  setParams={setPaginationParams}
                  count={paginationCount}
                  summaryUnit="items"
                  scrollTargetRef={listRef}
                />
              ) : null}
            </div>
          </div>
        )}
      </Container>
    </section>
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  wishlist: state.wishlist,
});

export default connect(mapStateToProps, {
  fetchWishlist,
  removeFromWishlist,
  addToCart,
})(WishlistPage);
