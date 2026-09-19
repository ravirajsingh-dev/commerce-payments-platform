import { useCallback, useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import { connect } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { FaLock } from "react-icons/fa";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import { formatPrice } from "@src/utils/productDetailHelpers";
import {
  applyCoupon,
  fetchCart,
  removeCoupon,
  removeFromCart,
  updateCartLineQuantity,
  updateCartLineSize,
} from "./cartActions";
import AvailableCouponsPanel from "./components/AvailableCouponsPanel";
import CouponCodeForm from "./components/CouponCodeForm";
import CartLineItem from "./components/CartLineItem";
import useCartVariantMeta from "./hooks/useCartVariantMeta";
import { lineKey } from "./cartReducer";

const breadcrumbs = [
  { label: "Home", link: "/" },
  { label: "Cart", link: null },
];

const EMPTY_CART_ITEMS = [];

const CartPage = ({
  auth: { isAuthenticated, loading: authLoading },
  cart: { cart, loading, updatingKey, removingKey },
  fetchCart,
  applyCoupon,
  removeCoupon,
  updateCartLineQuantity,
  updateCartLineSize,
  removeFromCart,
}) => {
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const [couponRefreshKey, setCouponRefreshKey] = useState(0);
  const items = cart?.items ?? EMPTY_CART_ITEMS;
  const { metaByVariantId, loadingMeta } = useCartVariantMeta(items);

  const handleApplyCoupon = useCallback(
    async (code) => {
      await applyCoupon(code);
      setCouponRefreshKey((k) => k + 1);
    },
    [applyCoupon],
  );

  const handleRemoveCoupon = useCallback(async () => {
    await removeCoupon();
    setCouponRefreshKey((k) => k + 1);
  }, [removeCoupon]);

  const handleQuantityChange = useCallback(
    (item, qty) => {
      updateCartLineQuantity({
        variantId: item.variantId,
        size: item.size || undefined,
        qty,
      });
    },
    [updateCartLineQuantity],
  );

  const handleSizeChange = useCallback(
    (item, newSize) => {
      updateCartLineSize({
        variantId: item.variantId,
        size: item.size || undefined,
        newSize,
        qty: item.quantity,
      });
    },
    [updateCartLineSize],
  );

  const handleRemove = useCallback(
    (item) => {
      removeFromCart({
        variantId: item.variantId,
        size: item.size || undefined,
      });
    },
    [removeFromCart],
  );

  if (authLoading || isAuthenticated === null) {
    return (
      <section className="cart-page">
        <BouncingLoader minHeight="280px" />
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: "/cart" }} />;
  }

  const showLoader = loading;
  const isEmpty = !loading && items.length === 0;

  return (
    <section className="cart-page">
      <AppBreadCrumb breadcrumbs={breadcrumbs} />
      <Container className="cart-page__container">
        {!showLoader && !isEmpty && cart?.itemCount > 0 ? (
          <p className="cart-page__count" aria-live="polite">
            {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
          </p>
        ) : null}

        {showLoader ? (
          <BouncingLoader minHeight="280px" />
        ) : isEmpty ? (
          <div className="cart-page__empty">
            <NoRecordsFound
              title="Your cart is empty"
              description="Browse our collections and add pieces you love."
            />
            <Link to="/collections" className="btn btn--theme cart-page__empty-btn">
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="cart-page__layout">
            <div className="cart-page__lines-panel">
              {loadingMeta ? (
                <BouncingLoader
                  minHeight="120px"
                  className="cart-page__meta-loader"
                  message="Loading product details…"
                />
              ) : null}
              <div className="cart-page__lines">
                {items.map((item) => {
                  const key = lineKey(item.variantId, item.size);
                  return (
                    <CartLineItem
                      key={key}
                      item={item}
                      meta={metaByVariantId[item.variantId]}
                      busy={updatingKey === key}
                      removing={removingKey === key}
                      onQuantityChange={handleQuantityChange}
                      onSizeChange={handleSizeChange}
                      onRemove={handleRemove}
                    />
                  );
                })}
              </div>
            </div>

            <aside className="cart-page__summary" aria-labelledby="cart-summary-title">
              <div className="cart-page__summary-inner">
                <h2 id="cart-summary-title" className="cart-page__summary-title">
                  Order summary
                </h2>

                <AvailableCouponsPanel
                  busy={updatingKey === "coupon"}
                  refreshKey={couponRefreshKey}
                  onApply={handleApplyCoupon}
                />
                <CouponCodeForm
                  appliedCode={cart.couponCode}
                  couponValid={cart.couponValid !== false}
                  couponMessage={cart.couponMessage}
                  busy={updatingKey === "coupon"}
                  onApply={handleApplyCoupon}
                  onRemove={handleRemoveCoupon}
                />

                <dl className="cart-page__summary-rows">
                  <div className="cart-page__summary-row">
                    <dt>Subtotal</dt>
                    <dd>{formatPrice(cart.subtotalAtCurrentPrices ?? cart.subtotal)}</dd>
                  </div>
                  {cart.discountTotal > 0 ? (
                    <div className="cart-page__summary-row cart-page__summary-row--discount">
                      <dt>
                        Discount
                        {cart.couponCode ? ` (${cart.couponCode})` : ""}
                      </dt>
                      <dd>-{formatPrice(cart.discountTotal)}</dd>
                    </div>
                  ) : null}
                  <div className="cart-page__summary-row cart-page__summary-row--total">
                    <dt>Estimated total</dt>
                    <dd>{formatPrice(cart.grandTotal ?? cart.subtotal)}</dd>
                  </div>
                  {cart.hasIssues &&
                  cart.subtotalAtCurrentPrices !== cart.subtotal ? (
                    <div className="cart-page__summary-row cart-page__summary-row--note">
                      <dt>At current prices</dt>
                      <dd>{formatPrice(cart.subtotalAtCurrentPrices)}</dd>
                    </div>
                  ) : null}
                </dl>

                {cart.couponCode && cart.couponValid === false ? (
                  <p className="cart-page__summary-warning">{cart.couponMessage}</p>
                ) : null}

                {cart.hasIssues ? (
                  <p className="cart-page__summary-warning">
                    Some items need attention before checkout. Review the messages
                    above.
                  </p>
                ) : (
                  <p className="cart-page__summary-note">
                    Shipping and taxes are calculated at checkout.
                  </p>
                )}

                <div className="cart-page__summary-actions">
                  {!cart.hasIssues && cart.couponValid !== false && items.length > 0 ? (
                    <Link
                      to="/checkout"
                      className="btn btn--theme btn--full cart-page__checkout-btn"
                    >
                      <FaLock aria-hidden />
                      Proceed to checkout
                    </Link>
                  ) : null}
                  <Link
                    to="/collections"
                    className="btn btn--outline btn--full cart-page__continue-btn"
                  >
                    Continue shopping
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        )}
      </Container>
    </section>
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  cart: state.cart,
});

export default connect(mapStateToProps, {
  fetchCart,
  applyCoupon,
  removeCoupon,
  updateCartLineQuantity,
  updateCartLineSize,
  removeFromCart,
})(CartPage);
