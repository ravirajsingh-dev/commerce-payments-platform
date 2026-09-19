import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import { formatPrice } from "@src/utils/productDetailHelpers";
import { getProductDetailPath } from "@src/utils/orderDisplayHelpers";

const OrderItemsList = ({ items = [], showLinks = true }) => {
  if (!items.length) return null;

  return (
    <ul className="order-items-list">
      {items.map((item) => {
        const key = `${item.variantId}:${item.size || ""}`;
        const productPath = showLinks ? getProductDetailPath(item) : null;
        const name = item.productNameSnapshot || "Product";

        return (
          <li key={key} className="order-items-list__item">
            <div className="order-items-list__main">
              {productPath ? (
                <Link to={productPath} className="order-items-list__name">
                  {name}
                </Link>
              ) : (
                <span className="order-items-list__name">{name}</span>
              )}
              <span className="order-items-list__price">
                {formatPrice(item.lineTotal)}
              </span>
            </div>
            <ul className="order-items-list__meta" aria-label="Item details">
              {item.skuSnapshot ? (
                <li className="order-items-list__chip">SKU {item.skuSnapshot}</li>
              ) : null}
              {item.size ? (
                <li className="order-items-list__chip">
                  Size {String(item.size).toUpperCase()}
                </li>
              ) : null}
              <li className="order-items-list__chip">Qty {item.quantity}</li>
              <li className="order-items-list__chip order-items-list__chip--muted">
                {formatPrice(item.unitPriceSnapshot)} each
              </li>
            </ul>
          </li>
        );
      })}
    </ul>
  );
};

OrderItemsList.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object),
  showLinks: PropTypes.bool,
};

export default OrderItemsList;
