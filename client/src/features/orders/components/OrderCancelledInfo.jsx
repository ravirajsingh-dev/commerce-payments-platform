import PropTypes from "prop-types";

import {
  formatOrderCancellationReason,
  hasOrderCancellationDetails,
  isOrderCancelledByAdmin,
} from "@src/constants/cancellationReasons";

const OrderCancelledInfo = ({ order }) => {
  if (!hasOrderCancellationDetails(order)) {
    return null;
  }

  const byAdmin = isOrderCancelledByAdmin(order);
  const reasonLabel = order.cancellation?.reason
    ? formatOrderCancellationReason(order.cancellation.reason)
    : null;

  return (
    <div
      className={`order-cancelled-info${byAdmin ? " order-cancelled-info--admin" : ""}`}
      role="status"
    >
      <p className="order-cancelled-info__title">
        {byAdmin ? "Order cancelled by our team" : "Order cancelled"}
      </p>
      <p className="order-cancelled-info__text">
        {byAdmin
          ? "We have cancelled this order. Details from our support team are below."
          : "This order is no longer active."}
      </p>
      {reasonLabel || order.cancellation?.note ? (
        <dl className="order-cancelled-info__meta">
          {reasonLabel ? (
            <div>
              <dt>Reason</dt>
              <dd>{reasonLabel}</dd>
            </div>
          ) : null}
          {order.cancellation?.note ? (
            <div>
              <dt>{byAdmin ? "Message from our team" : "Note"}</dt>
              <dd>{order.cancellation.note}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
};

OrderCancelledInfo.propTypes = {
  order: PropTypes.object,
};

export default OrderCancelledInfo;
