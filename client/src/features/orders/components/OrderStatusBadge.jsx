import PropTypes from "prop-types";

import { formatOrderStatus } from "@src/utils/orderDisplayHelpers";

const OrderStatusBadge = ({ status }) => {
  const modifier = status || "default";

  return (
    <span className={`order-status-badge order-status-badge--${modifier}`}>
      {formatOrderStatus(status)}
    </span>
  );
};

OrderStatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
};

export default OrderStatusBadge;
