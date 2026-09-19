import PropTypes from "prop-types";

import {
  formatOrderDate,
  formatPaymentStatus,
  formatOrderShippingLine,
} from "@src/utils/orderDisplayHelpers";
import OrderItemsList from "./OrderItemsList";
import OrderStatusBadge from "./OrderStatusBadge";
import OrderDownloadInvoiceButton from "./OrderDownloadInvoiceButton";
import OrderCancellationPanel from "./OrderCancellationPanel";
import OrderClaimPanel from "./OrderClaimPanel";
import OrderCancelledInfo from "./OrderCancelledInfo";
import OrderTotalsSummary from "./OrderTotalsSummary";
import OrderTrackingPanel from "./OrderTrackingPanel";
import OrderReviewsSection from "./OrderReviewsSection";
import { shouldShowClaimSection } from "@src/features/orders/utils/claimEligibilityHelpers";
import { STATUS } from "@src/constants/order";

const OrderDetailView = ({ order, onOrderUpdated }) => {
  if (!order) return null;

  const paymentLabel =
    order.paymentMethod === "cod" ? "Cash on delivery" : order.paymentMethod;
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;
  const itemLabel = itemCount === 1 ? "1 item" : `${itemCount} items`;
  const addr = order.addressSnapshot;
  const shippingLine = addr ? formatOrderShippingLine(addr) : "";
  const isDelivered = order.status === "delivered";
  const showTracking = order.status !== STATUS.CANCELLED.value;
  const showClaimSection = shouldShowClaimSection(order);

  return (
    <div className="order-detail-view">
      <article className="order-detail-sheet" aria-label="Order details">
        <header className="order-detail-sheet__hero">
          <div className="order-detail-ref">
            <div className="order-detail-ref__head">
              <span className="order-detail-ref__label">Order reference</span>
              <div className="order-detail-ref__actions">
                <OrderStatusBadge status={order.status} />
                <OrderCancellationPanel
                  order={order}
                  onOrderUpdated={onOrderUpdated}
                  compact
                />
              </div>
            </div>
            <p className="order-detail-ref__no">{order.orderNo}</p>
            <p className="order-detail-ref__meta">
              <span>Placed {formatOrderDate(order.createdAt)}</span>
              {itemCount > 0 ? (
                <span className="order-detail-ref__meta-chip">{itemLabel}</span>
              ) : null}
            </p>
          </div>

          {shippingLine ? (
            <div className="order-detail-sheet__strip order-detail-sheet__strip--shipping">
              <span className="order-detail-sheet__strip-label">Ship to</span>
              <p className="order-detail-sheet__strip-value">{shippingLine}</p>
            </div>
          ) : null}

          <dl className="order-detail-sheet__strip order-detail-sheet__strip--payment">
            <div className="order-detail-sheet__strip-item">
              <dt>Payment</dt>
              <dd>{paymentLabel}</dd>
            </div>
            <span className="order-detail-sheet__strip-sep" aria-hidden>
              ·
            </span>
            <div className="order-detail-sheet__strip-item">
              <dt>Status</dt>
              <dd>{formatPaymentStatus(order.paymentStatus)}</dd>
            </div>
          </dl>

          <OrderCancelledInfo order={order} />
        </header>

        <div className="order-detail-sheet__body">
          {showTracking ? (
            <section
              className="order-detail-section order-detail-section--tracking"
              aria-labelledby="order-detail-tracking-heading"
            >
              <OrderTrackingPanel
                orderStatus={order.status}
                orderCreatedAt={order.createdAt}
                shipment={order.shipment}
                events={order.trackingEvents}
                claim={order.claim}
              />
            </section>
          ) : null}

          <section
            className="order-detail-section order-detail-section--items"
            aria-labelledby="order-detail-items-heading"
          >
            <h2 id="order-detail-items-heading" className="order-detail-section__title">
              Items ordered
              {itemCount > 0 ? (
                <span className="order-detail-section__count">{itemLabel}</span>
              ) : null}
            </h2>
            <OrderItemsList items={order.items} />
          </section>

          {isDelivered ? <OrderReviewsSection orderNo={order.orderNo} /> : null}

          <section
            className="order-detail-section order-detail-section--summary"
            aria-labelledby="order-detail-summary-heading"
          >
            <h2
              id="order-detail-summary-heading"
              className="order-detail-section__title"
            >
              Summary
            </h2>
            <OrderTotalsSummary
              order={order}
              sheet
              showCodChip={order.paymentMethod === "cod"}
            />
            {isDelivered ? (
              <div className="order-detail-sheet__invoice">
                <OrderDownloadInvoiceButton
                  orderNo={order.orderNo}
                  canDownloadInvoice
                />
              </div>
            ) : null}
          </section>

          {showClaimSection ? (
            <div className="order-detail-sheet__help">
              <OrderClaimPanel order={order} onOrderUpdated={onOrderUpdated} />
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
};

OrderDetailView.propTypes = {
  order: PropTypes.object,
  onOrderUpdated: PropTypes.func,
};

export default OrderDetailView;
