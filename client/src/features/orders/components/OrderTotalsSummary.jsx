import PropTypes from "prop-types";

import { formatPrice } from "@src/utils/productDetailHelpers";

const AmountLines = ({ amounts, rowClassName }) => {
  const { items, discount, shipping, gst } = amounts;

  return (
    <>
      <div className={rowClassName}>
        <dt>Items</dt>
        <dd>{formatPrice(items)}</dd>
      </div>
      {discount > 0 ? (
        <div className={`${rowClassName} ${rowClassName}--discount`}>
          <dt>Discount</dt>
          <dd>-{formatPrice(discount)}</dd>
        </div>
      ) : null}
      {gst > 0 ? (
        <div className={rowClassName}>
          <dt>GST</dt>
          <dd>{formatPrice(gst)}</dd>
        </div>
      ) : null}
      <div className={rowClassName}>
        <dt>Shipping</dt>
        <dd>{shipping > 0 ? formatPrice(shipping) : "Free"}</dd>
      </div>
    </>
  );
};

AmountLines.propTypes = {
  amounts: PropTypes.object.isRequired,
  rowClassName: PropTypes.string.isRequired,
};

const OrderTotalsSummary = ({ order, inline = false, sheet = false, showCodChip = false }) => {
  if (!order?.amounts) return null;

  const { total } = order.amounts;

  if (sheet) {
    return (
      <div className="order-detail-summary">
        <dl className="order-detail-summary__lines">
          <AmountLines
            amounts={order.amounts}
            rowClassName="order-detail-summary__row"
          />
        </dl>
        <div className="order-detail-summary__footer">
          <div className="order-detail-summary__total">
            <span className="order-detail-summary__total-label">Total</span>
            <span className="order-detail-summary__total-value">{formatPrice(total)}</span>
          </div>
          {showCodChip ? (
            <span className="order-detail-summary__cod">Cash on delivery</span>
          ) : null}
        </div>
      </div>
    );
  }

  if (inline) {
    return (
      <dl className="order-totals order-totals--inline">
        <AmountLines amounts={order.amounts} rowClassName="order-totals__row" />
        <div className="order-totals__row order-totals__row--grand">
          <dt>Total</dt>
          <dd>{formatPrice(total)}</dd>
        </div>
      </dl>
    );
  }

  return (
    <dl className="order-totals">
      <AmountLines amounts={order.amounts} rowClassName="order-totals__row" />
      <div className="order-totals__row order-totals__row--grand">
        <dt>Total</dt>
        <dd>{formatPrice(total)}</dd>
      </div>
    </dl>
  );
};

OrderTotalsSummary.propTypes = {
  order: PropTypes.shape({
    amounts: PropTypes.shape({
      items: PropTypes.number,
      discount: PropTypes.number,
      shipping: PropTypes.number,
      gst: PropTypes.number,
      total: PropTypes.number,
    }),
  }),
  inline: PropTypes.bool,
  sheet: PropTypes.bool,
  showCodChip: PropTypes.bool,
};

export default OrderTotalsSummary;
