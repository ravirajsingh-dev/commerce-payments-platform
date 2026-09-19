import PropTypes from "prop-types";
import { FaChevronRight } from "react-icons/fa";
import { Link } from "react-router-dom";

import {
  formatOrderDate,
  formatPaymentStatus,
} from "@src/utils/orderDisplayHelpers";
import { formatPrice } from "@src/utils/productDetailHelpers";
import {
  formatTrackingStatus,
  hasShipmentSummary,
} from "@src/utils/shipmentDisplayHelpers";
import OrderStatusBadge from "./OrderStatusBadge";

const OrderListCard = ({ order }) => {
  const detailPath = `/user/orders/${encodeURIComponent(order.orderNo)}`;
  const summary = order.shipmentSummary;
  const showTracking = hasShipmentSummary(summary);
  const isDelivered = order.status === "delivered";
  const itemCount = Number(order.itemCount || 0);
  const itemLabel = itemCount === 1 ? "1 item" : `${itemCount} items`;
  const paymentMethodLabel =
    order.paymentMethod === "cod" ? "COD" : String(order.paymentMethod || "").toUpperCase();
  const totalLabel = formatPrice(order.amounts?.total);

  return (
    <Link
      to={detailPath}
      className="order-list-card"
      aria-label={`View order ${order.orderNo}`}
    >
      <div className="order-list-card__main">
        <div className="order-list-card__info">
          <span className="order-list-card__label">Order reference</span>
          <span className="order-list-card__order-no">{order.orderNo}</span>
          {order.createdAt ? (
            <time className="order-list-card__date" dateTime={order.createdAt}>
              {formatOrderDate(order.createdAt)}
            </time>
          ) : null}
        </div>

        <div className="order-list-card__aside">
          <OrderStatusBadge status={order.status} />
          <FaChevronRight className="order-list-card__chevron" aria-hidden />
        </div>
      </div>

      {isDelivered ? (
        <p className="order-list-card__review-hint">Rate &amp; review your items</p>
      ) : null}

      <div className="order-list-card__commerce-meta">
        <span className="order-list-card__meta-chip">
          <span className="order-list-card__meta-label">Items</span>
          <strong>{itemLabel}</strong>
        </span>
        <span className="order-list-card__meta-chip">
          <span className="order-list-card__meta-label">Total</span>
          <strong>{totalLabel}</strong>
        </span>
        <span className="order-list-card__meta-chip">
          <span className="order-list-card__meta-label">Payment</span>
          <strong>{paymentMethodLabel}</strong>
          {order.paymentStatus ? (
            <span className="order-list-card__payment-status">
              {formatPaymentStatus(order.paymentStatus)}
            </span>
          ) : null}
        </span>
      </div>

      {showTracking ? (
        <p className="order-list-card__tracking">
          {summary.carrierName ? (
            <>
              <span className="order-list-card__tracking-label">Carrier</span>
              <span>{summary.carrierName}</span>
            </>
          ) : null}
          {summary.trackingNumber ? (
            <>
              <span className="order-list-card__tracking-label">AWB</span>
              <strong>{summary.trackingNumber}</strong>
            </>
          ) : null}
          {summary.latestStepMessage ? (
            <span className="order-list-card__tracking-step">
              {summary.currentStatus
                ? `${formatTrackingStatus(summary.currentStatus)} · `
                : ""}
              {summary.latestStepMessage}
            </span>
          ) : null}
        </p>
      ) : null}
    </Link>
  );
};

OrderListCard.propTypes = {
  order: PropTypes.shape({
    orderNo: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    createdAt: PropTypes.string,
    itemCount: PropTypes.number,
    paymentMethod: PropTypes.string,
    paymentStatus: PropTypes.string,
    amounts: PropTypes.shape({
      total: PropTypes.number,
    }),
    shipmentSummary: PropTypes.shape({
      carrierName: PropTypes.string,
      trackingNumber: PropTypes.string,
      currentStatus: PropTypes.string,
      latestStepMessage: PropTypes.string,
      latestStepAt: PropTypes.string,
    }),
  }).isRequired,
};

export default OrderListCard;
