import { useCallback, useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import { connect } from "react-redux";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { FaCheck } from "react-icons/fa";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import { formatPrice } from "@src/utils/productDetailHelpers";
import { formatOrderAddress } from "@src/utils/orderDisplayHelpers";
import { fetchOrderByOrderNo } from "@src/features/orders/orderActions";

const OrderConfirmationPage = ({
  auth: { isAuthenticated, loading: authLoading },
  fetchOrderByOrderNo,
}) => {
  const { orderNo = "" } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState("");

  const normalizedOrderNo = String(orderNo || "").trim();

  const loadOrderFallback = useCallback(async () => {
    if (!normalizedOrderNo) return;
    setOrderLoading(true);
    setOrderError("");
    try {
      const data = await fetchOrderByOrderNo(normalizedOrderNo);
      setOrder(data || null);
    } catch (err) {
      setOrder(null);
      if (err?.status !== 404) {
        setOrderError(err?.message || "Unable to load order details.");
      }
    } finally {
      setOrderLoading(false);
    }
  }, [fetchOrderByOrderNo, normalizedOrderNo]);

  useEffect(() => {
    const stateOrder = location.state?.order || null;
    if (stateOrder) {
      setOrder(stateOrder);
      setOrderError("");
      setOrderLoading(false);
      return;
    }
    setOrder(null);
    loadOrderFallback();
  }, [location.state, loadOrderFallback]);

  if (authLoading || isAuthenticated === null) {
    return (
      <section className="checkout-confirmation">
        <BouncingLoader minHeight="280px" />
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `/checkout/confirmation/${normalizedOrderNo}` }}
      />
    );
  }

  if (orderLoading && !order) {
    return (
      <section className="checkout-confirmation">
        <BouncingLoader minHeight="280px" />
      </section>
    );
  }

  const breadcrumbs = [
    { label: "Home", link: "/" },
    { label: "Checkout", link: "/checkout" },
    { label: "Order confirmed", link: null },
  ];

  const displayOrderNo = order?.orderNo || normalizedOrderNo;

  return (
    <section className="checkout-confirmation">
      <AppBreadCrumb breadcrumbs={breadcrumbs} title="Order confirmed" />
      <Container className="checkout-confirmation__container">
        <div className="checkout-confirmation__card">
          <div className="checkout-confirmation__hero" aria-hidden>
            <span className="checkout-confirmation__icon">
              <FaCheck />
            </span>
          </div>

          <p className="checkout-confirmation__eyebrow">Thank you</p>
          <h2 className="checkout-confirmation__title">Your order is confirmed</h2>
          {displayOrderNo ? (
            <p className="checkout-confirmation__order-no">
              Order{" "}
              <span className="checkout-confirmation__order-badge">
                {displayOrderNo}
              </span>
            </p>
          ) : null}

          {order ? (
            <div className="checkout-confirmation__body">
              <dl className="checkout-confirmation__summary">
                <div className="checkout-confirmation__row">
                  <dt>Payment</dt>
                  <dd>Cash on delivery</dd>
                </div>
                <div className="checkout-confirmation__row">
                  <dt>Total</dt>
                  <dd className="checkout-confirmation__total">
                    {formatPrice(order.amounts?.total)}
                  </dd>
                </div>
                <div className="checkout-confirmation__row">
                  <dt>Items</dt>
                  <dd>{order.items?.length || 0}</dd>
                </div>
              </dl>

              {order.addressSnapshot ? (
                <div className="checkout-confirmation__panel checkout-confirmation__address">
                  <h3 className="checkout-confirmation__section-title">
                    Shipping to
                  </h3>
                  <p className="checkout-confirmation__address-text">
                    {formatOrderAddress(order.addressSnapshot)}
                  </p>
                </div>
              ) : null}

              {(order.items || []).length > 0 ? (
                <ul className="checkout-confirmation__items">
                  {(order.items || []).map((item) => (
                    <li
                      key={`${item.variantId}-${item.size || ""}`}
                      className="checkout-confirmation__item"
                    >
                      <div className="checkout-confirmation__item-main">
                        <span className="checkout-confirmation__item-name">
                          {item.productNameSnapshot}
                        </span>
                        {item.size ? (
                          <span className="checkout-confirmation__item-meta">
                            Size {String(item.size).toUpperCase()}
                          </span>
                        ) : null}
                      </div>
                      <span className="checkout-confirmation__item-qty">
                        ×{item.quantity} · {formatPrice(item.lineTotal)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <>
              <p className="checkout-confirmation__fallback">
                We received your order. View it in your order history for full details.
              </p>
              {orderError ? (
                <p className="checkout-confirmation__fallback">{orderError}</p>
              ) : null}
            </>
          )}

          <div className="checkout-confirmation__actions">
            <Link
              to="/collections"
              className="btn btn--theme checkout-confirmation__btn checkout-confirmation__btn--primary"
            >
              Continue shopping
            </Link>
            {order?.orderNo ? (
              <Link
                to={`/user/orders/${encodeURIComponent(order.orderNo)}`}
                className="btn btn--outline checkout-confirmation__btn checkout-confirmation__btn--secondary"
              >
                View order
              </Link>
            ) : (
              <Link
                to="/user/orders"
                className="btn btn--outline checkout-confirmation__btn checkout-confirmation__btn--secondary"
              >
                Order history
              </Link>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth,
});

export default connect(mapStateToProps, { fetchOrderByOrderNo })(OrderConfirmationPage);
