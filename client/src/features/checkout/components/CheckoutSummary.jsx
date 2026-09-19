import PropTypes from "prop-types";

import { formatPrice } from "@src/utils/productDetailHelpers";
import {
  CART_ISSUE_LABELS,
  formatCartLineAttributes,
  getCartLineTitle,
} from "@src/features/cart/cartDisplayHelpers";

const CheckoutSummary = ({ preview, metaByVariantId = {}, compact = false }) => {
  if (!preview?.amounts) return null;

  const { items, discount, shipping, gst, total } = preview.amounts;

  const rootClass = compact ? "checkout-summary checkout-summary--compact" : "checkout-summary";

  return (
    <div className={rootClass}>
      {!compact ? (
        <h2 className="checkout-summary__title">Order summary</h2>
      ) : null}

      <ul className="checkout-summary__items">
        {preview.items.map((item) => {
          const key = `${item.variantId}:${item.size || ""}`;
          const meta = metaByVariantId[item.variantId] || {};
          const productName = getCartLineTitle(meta);
          const attributeText = formatCartLineAttributes(
            item.attributesSnapshot,
            meta,
          );
          const issueLabels = (item.issues || [])
            .map((code) => CART_ISSUE_LABELS[code])
            .filter(Boolean);

          return (
            <li key={key} className="checkout-summary__item">
              <div className="checkout-summary__item-head">
                <p className="checkout-summary__item-name">{productName}</p>
                <span className="checkout-summary__item-price">
                  {formatPrice(item.lineTotal)}
                </span>
              </div>
              <div className="checkout-summary__item-details">
                <span className="checkout-summary__item-qty">Qty {item.quantity}</span>
                {item.size ? (
                  <span className="checkout-summary__item-meta">
                    Size {item.size.toUpperCase()}
                  </span>
                ) : null}
                {attributeText ? (
                  <span className="checkout-summary__item-meta">{attributeText}</span>
                ) : null}
              </div>
              {issueLabels.length > 0 ? (
                <ul className="checkout-summary__item-issues">
                  {issueLabels.map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>

      <dl className="checkout-summary__totals">
        <div className="checkout-summary__row">
          <dt>Items</dt>
          <dd>{formatPrice(items)}</dd>
        </div>
        {discount > 0 ? (
          <div className="checkout-summary__row checkout-summary__row--discount">
            <dt>
              Discount
              {preview.couponCode ? ` (${preview.couponCode})` : ""}
            </dt>
            <dd>-{formatPrice(discount)}</dd>
          </div>
        ) : null}
        {gst > 0 ? (
          <div className="checkout-summary__row">
            <dt>GST</dt>
            <dd>{formatPrice(gst)}</dd>
          </div>
        ) : null}
        <div className="checkout-summary__row">
          <dt>Shipping</dt>
          <dd>{shipping > 0 ? formatPrice(shipping) : "Free"}</dd>
        </div>
        <div className="checkout-summary__row checkout-summary__row--grand">
          <dt>Total</dt>
          <dd>{formatPrice(total)}</dd>
        </div>
      </dl>

      <p className="checkout-summary__cod-note">
        Cash on delivery (COD). Pay when your order arrives.
      </p>
    </div>
  );
};

CheckoutSummary.propTypes = {
  preview: PropTypes.object,
  metaByVariantId: PropTypes.object,
  compact: PropTypes.bool,
};

export default CheckoutSummary;
