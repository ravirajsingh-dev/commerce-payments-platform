import { useCallback, useEffect, useMemo, useState } from "react";
import { Container } from "react-bootstrap";
import { connect } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { FaLock } from "react-icons/fa";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import {
  placeOrder,
  previewCheckout,
} from "@src/features/checkout/checkoutActions";
import { setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeAllErrors } from "@src/app/state/actions/commonActions";
import { applyCoupon, fetchCart, removeCoupon } from "@src/features/cart/cartActions";
import AvailableCouponsPanel from "@src/features/cart/components/AvailableCouponsPanel";
import CouponCodeForm from "@src/features/cart/components/CouponCodeForm";
import CheckoutAddressSection from "@src/features/checkout/components/CheckoutAddressSection";
import CheckoutSummary from "@src/features/checkout/components/CheckoutSummary";
import useCartVariantMeta from "@src/features/cart/hooks/useCartVariantMeta";

const breadcrumbs = [
  { label: "Home", link: "/" },
  { label: "Cart", link: "/cart" },
  { label: "Checkout", link: null },
];

const CheckoutPage = ({
  auth: { isAuthenticated, loading: authLoading },
  cart: { updatingKey },
  removeAllErrors,
  setAlert,
  setErrorsList,
  fetchCart,
  applyCoupon,
  removeCoupon,
  previewCheckout,
  placeOrder,
}) => {
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [couponRefreshKey, setCouponRefreshKey] = useState(0);

  const { metaByVariantId } = useCartVariantMeta(preview?.items ?? []);

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const data = await previewCheckout();
      setPreview(data);
    } catch (err) {
      setPreview(null);
      setPreviewError(err.message || "Unable to load checkout preview.");
    } finally {
      setPreviewLoading(false);
    }
  }, [previewCheckout]);

  const handleApplyCoupon = useCallback(
    async (code) => {
      await applyCoupon(code);
      await loadPreview();
      setCouponRefreshKey((k) => k + 1);
    },
    [applyCoupon, loadPreview],
  );

  const handleRemoveCoupon = useCallback(async () => {
    await removeCoupon();
    await loadPreview();
    setCouponRefreshKey((k) => k + 1);
  }, [removeCoupon, loadPreview]);

  const couponPanelKey = useMemo(
    () =>
      `${couponRefreshKey}-${preview?.amounts?.items ?? 0}-${preview?.couponCode ?? ""}`,
    [couponRefreshKey, preview?.amounts?.items, preview?.couponCode],
  );

  useEffect(() => {
    if (isAuthenticated) {
      loadPreview();
    }
  }, [isAuthenticated, loadPreview]);

  const mapApiErrors = (errors = []) => {
    errors.forEach((error) => {
      setErrorsList(error.msg || error.message, error.path || "");
    });
  };

  const handlePlaceOrder = async () => {
    removeAllErrors();

    if (!selectedAddressId) {
      setAlert("Please add or select a shipping address.", "warning");
      return;
    }

    if (!preview?.canCheckout) {
      setAlert("Your cart has issues that must be resolved before checkout.", "danger");
      return;
    }

    setPlacing(true);
    try {
      const order = await placeOrder({
        userAddressId: selectedAddressId,
        paymentMethod: "cod",
      });
      setAlert("Order placed successfully.", "success");
      await fetchCart();
      navigate(`/checkout/confirmation/${encodeURIComponent(order.orderNo)}`, {
        state: { order },
      });
    } catch (err) {
      mapApiErrors(err.errors);
      setAlert(err.message || "Unable to place order.", "danger");
    } finally {
      setPlacing(false);
    }
  };

  if (authLoading || isAuthenticated === null) {
    return (
      <section className="checkout-page">
        <BouncingLoader minHeight="280px" />
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: "/checkout" }} />;
  }

  if (previewLoading && !preview) {
    return (
      <section className="checkout-page">
        <BouncingLoader minHeight="280px" message="Loading checkout…" />
      </section>
    );
  }

  if (previewError || !preview || preview.items.length === 0) {
    return (
      <section className="checkout-page">
        <AppBreadCrumb breadcrumbs={breadcrumbs} />
        <Container className="checkout-page__container py-5">
          <NoRecordsFound
            title="Nothing to checkout"
            description={
              previewError || "Your cart is empty. Add items before checkout."
            }
          />
          <div className="checkout-page__empty-actions">
            <Link to="/cart" className="btn btn--outline">
              View cart
            </Link>
            <Link to="/collections" className="btn btn--theme">
              Continue shopping
            </Link>
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <AppBreadCrumb breadcrumbs={breadcrumbs} />
      <Container className="checkout-page__container">
        <p className="checkout-page__intro">Cash on delivery · Secure checkout</p>
        <div className="checkout-page__layout">
          <div className="checkout-page__main">
            <CheckoutAddressSection
              selectedAddressId={selectedAddressId}
              onSelectAddressId={setSelectedAddressId}
            />

            {!preview.canCheckout ? (
              <p className="checkout-page__blocked">
                {preview.blockingIssues?.includes("COUPON_INVALID")
                  ? preview.couponMessage || "Your coupon is no longer valid."
                  : "Some items in your cart need attention."}{" "}
                <Link to="/cart">Return to your cart</Link>
                {preview.blockingIssues?.includes("COUPON_INVALID")
                  ? " to update or remove the coupon."
                  : " to fix stock or availability issues before placing your order."}
              </p>
            ) : null}
          </div>

          <aside className="checkout-page__aside" aria-label="Order summary">
            <div className="checkout-page__order-panel">
              {previewLoading || placing ? (
                <BouncingLoader
                  minHeight="280px"
                  message={
                    placing ? "Placing order…" : "Updating order summary…"
                  }
                />
              ) : (
                <>
                  <AvailableCouponsPanel
                    busy={updatingKey === "coupon"}
                    refreshKey={couponPanelKey}
                    onApply={handleApplyCoupon}
                  />
                  <CouponCodeForm
                    appliedCode={preview.couponCode}
                    couponValid={preview.couponValid !== false}
                    couponMessage={preview.couponMessage}
                    busy={updatingKey === "coupon"}
                    onApply={handleApplyCoupon}
                    onRemove={handleRemoveCoupon}
                  />
                  <CheckoutSummary
                    preview={preview}
                    metaByVariantId={metaByVariantId}
                  />
                  <div className="checkout-page__order-actions">
                    <button
                      type="button"
                      className="btn btn--theme btn--full checkout-page__place-btn"
                      onClick={handlePlaceOrder}
                      disabled={!preview.canCheckout}
                    >
                      <FaLock aria-hidden />
                      Place order (COD)
                    </button>
                    <Link
                      to="/cart"
                      className="btn btn--outline btn--full checkout-page__back-btn"
                    >
                      Back to cart
                    </Link>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  cart: state.cart,
});

export default connect(mapStateToProps, {
  removeAllErrors,
  setAlert,
  setErrorsList,
  fetchCart,
  applyCoupon,
  removeCoupon,
  previewCheckout,
  placeOrder,
})(CheckoutPage);
