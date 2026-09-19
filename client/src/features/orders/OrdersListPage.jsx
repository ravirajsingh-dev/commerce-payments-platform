import { useCallback, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Container } from "react-bootstrap";
import { Link } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import AppPagination from "@src/components/common/AppPagination";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import { fetchOrdersList } from "@src/features/orders/orderActions";
import OrderListCard from "./components/OrderListCard";

const breadcrumbs = [
  { label: "Home", link: "/" },
  { label: "My Account", link: "/user/my-account" },
  { label: "Orders", link: null },
];

const DEFAULT_ORDER_PAGE_SIZE = 10;

const OrdersListPage = ({ fetchOrdersList }) => {
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [params, setParams] = useState({
    page: 1,
    limit: DEFAULT_ORDER_PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const listAnchorRef = useRef(null);

  const loadOrders = useCallback(async ({ page, limit }) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrdersList({ page, limit });
      setOrders(data.orders || []);
      setTotalCount(data.pagination?.total || 0);
    } catch (err) {
      setOrders([]);
      setTotalCount(0);
      setError(err.message || "Unable to load your orders.");
    } finally {
      setLoading(false);
    }
  }, [fetchOrdersList]);

  useEffect(() => {
    loadOrders(params);
  }, [loadOrders, params]);

  return (
    <section className="orders-page">
      <AppBreadCrumb breadcrumbs={breadcrumbs} title="Order history" />
      <Container className="orders-page__container">
        <p className="orders-page__intro">
          Tap an order reference to view full details, items, and delivery status.
        </p>

        {loading ? (
          <BouncingLoader minHeight="280px" />
        ) : error ? (
          <div className="orders-page__error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => loadOrders(params)}
            >
              Try again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="orders-page__empty">
            <NoRecordsFound message="You have not placed any orders yet." />
            <Link to="/collections" className="btn btn--theme">
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            <ul ref={listAnchorRef} className="orders-page__list">
              {orders.map((order) => (
                <li key={order.orderNo}>
                  <OrderListCard order={order} />
                </li>
              ))}
            </ul>

            <AppPagination
              variant="catalog"
              className="orders-page__pagination collection-page__pagination"
              params={params}
              setParams={setParams}
              count={totalCount}
              summaryUnit="orders"
              scrollTargetRef={listAnchorRef}
            />
          </>
        )}

        <p className="orders-page__account-link">
          <Link to="/user/my-account">Back to My Account</Link>
        </p>
      </Container>
    </section>
  );
};

export default connect(null, { fetchOrdersList })(OrdersListPage);
