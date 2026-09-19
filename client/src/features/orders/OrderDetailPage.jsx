import { useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { Container } from "react-bootstrap";
import { FaArrowLeft } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";

import AppBreadCrumb from "@src/components/common/AppBreadCrumb";
import BouncingLoader from "@src/components/common/Loaders/BouncingLoader";
import NoRecordsFound from "@src/components/common/NoRecordsFound/NoRecordsFound";
import { fetchOrderByOrderNo } from "@src/features/orders/orderActions";
import OrderDetailView from "./components/OrderDetailView";

const OrderDetailPage = ({ fetchOrderByOrderNo }) => {
  const { orderNo = "" } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      const data = await fetchOrderByOrderNo(orderNo);
      setOrder(data);
    } catch (err) {
      setOrder(null);
      if (err.status === 404) {
        setNotFound(true);
      } else {
        setError(err.message || "Unable to load this order.");
      }
    } finally {
      setLoading(false);
    }
  }, [orderNo, fetchOrderByOrderNo]);

  useEffect(() => {
    if (orderNo) {
      loadOrder();
    }
  }, [loadOrder, orderNo]);

  const breadcrumbs = [
    { label: "Home", link: "/" },
    { label: "My Account", link: "/user/my-account" },
    { label: "Orders", link: "/user/orders" },
    { label: order?.orderNo || orderNo, link: null },
  ];

  return (
    <section className="orders-page orders-page--detail">
      <AppBreadCrumb breadcrumbs={breadcrumbs} title="Order details" />
      <Container className="orders-page__container orders-page__container--detail">
        {loading ? (
          <BouncingLoader minHeight="280px" />
        ) : notFound ? (
          <div className="orders-page__empty">
            <NoRecordsFound message="We could not find that order." />
            <Link to="/user/orders" className="btn btn--outline">
              <FaArrowLeft aria-hidden />
              Back to orders
            </Link>
          </div>
        ) : error ? (
          <div className="orders-page__error" role="alert">
            <p>{error}</p>
            <button type="button" className="btn btn--outline" onClick={loadOrder}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <OrderDetailView order={order} onOrderUpdated={setOrder} />
            <nav className="orders-page__back" aria-label="Order navigation">
              <Link to="/user/orders" className="btn btn--outline orders-page__back-btn">
                <FaArrowLeft aria-hidden />
                All orders
              </Link>
            </nav>
          </>
        )}
      </Container>
    </section>
  );
};

export default connect(null, { fetchOrderByOrderNo })(OrderDetailPage);
