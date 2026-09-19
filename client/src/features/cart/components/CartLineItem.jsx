import PropTypes from "prop-types";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FaTrash } from "react-icons/fa";

import { buildSizeOptions } from "@src/utils/productDetailHelpers";
import CartLineSpecGrid from "./CartLineSpecGrid";
import {
  CART_ISSUE_LABELS,
  formatPrice,
  getCartLineImage,
  getCartLineMaxQty,
  getCartLineProductLink,
  getCartLineTitle,
  getOrderedCartLineAttributes,
} from "../cartDisplayHelpers";

const CartLineItem = ({
  item,
  meta,
  busy = false,
  removing = false,
  onQuantityChange,
  onSizeChange,
  onRemove,
}) => {
  const title = getCartLineTitle(meta);
  const imageUrl = getCartLineImage(meta);
  const productLink = getCartLineProductLink(meta, item);
  const attributes = useMemo(
    () => getOrderedCartLineAttributes(item.attributesSnapshot, meta),
    [item.attributesSnapshot, meta],
  );
  const sizeOptions = useMemo(
    () => buildSizeOptions(meta?.variant),
    [meta?.variant],
  );
  const currentSize = String(item.size || "").trim().toLowerCase();
  const maxQty = getCartLineMaxQty(item);
  const hasSize = currentSize || sizeOptions.length > 0;
  const hasSpecs = attributes.length > 0 || hasSize;
  const issues = (item.issues || []).map(
    (code) => CART_ISSUE_LABELS[code] || code,
  );

  const media = imageUrl ? (
    <div
      className="cart-line__thumb"
      style={{ backgroundImage: `url(${encodeURI(imageUrl)})` }}
      aria-hidden
    />
  ) : (
    <div className="cart-line__thumb cart-line__thumb--placeholder">
      {title.slice(0, 1)}
    </div>
  );

  const pricing = (
    <div className="cart-line__pricing">
      <span className="cart-line__price">{formatPrice(item.lineTotal)}</span>
      {item.priceChanged ? (
        <span className="cart-line__price-note">
          Was {formatPrice(item.unitPriceSnapshot * item.quantity)} · now{" "}
          {formatPrice(item.lineTotalAtCurrentPrice)}
        </span>
      ) : null}
    </div>
  );

  return (
    <article className={`cart-line${busy ? " cart-line--busy" : ""}`}>
      {productLink ? (
        <Link to={productLink} className="cart-line__media-link">
          {media}
        </Link>
      ) : (
        <div className="cart-line__media-link">{media}</div>
      )}

      <div className="cart-line__body">
        <div className="cart-line__head">
          <div className="cart-line__head-main">
            {productLink ? (
              <Link to={productLink} className="cart-line__title">
                {title}
              </Link>
            ) : (
              <h2 className="cart-line__title">{title}</h2>
            )}
          </div>
          <div className="cart-line__head-end">
            {pricing}
            <button
              type="button"
              className="cart-line__remove"
              onClick={() => onRemove(item)}
              disabled={removing || busy}
              aria-label={`Remove ${title} from cart`}
            >
              <FaTrash aria-hidden />
            </button>
          </div>
        </div>

        {hasSpecs ? (
          <div className="cart-line__spec-row">
            <CartLineSpecGrid
              attributes={attributes}
              hasSize={hasSize}
              sizeValue={currentSize}
              sizeOptions={sizeOptions}
              sizeDisabled={!item.isAvailable}
              sizeBusy={busy}
              sizeLabel={`Size for ${title}`}
              onSizeChange={(newSize) => onSizeChange(item, newSize)}
              quantity={item.quantity}
              quantityMin={1}
              quantityMax={maxQty}
              quantityDisabled={!item.isAvailable}
              quantityBusy={busy}
              quantityLabel={`Quantity for ${title}`}
              onQuantityChange={(qty) => onQuantityChange(item, qty)}
            />
          </div>
        ) : (
          <div className="cart-line__spec-row cart-line__spec-row--qty-only">
            <CartLineSpecGrid
              attributes={[]}
              hasSize={false}
              quantity={item.quantity}
              quantityMin={1}
              quantityMax={maxQty}
              quantityDisabled={!item.isAvailable}
              quantityBusy={busy}
              quantityLabel={`Quantity for ${title}`}
              onQuantityChange={(qty) => onQuantityChange(item, qty)}
            />
          </div>
        )}

        {issues.length > 0 ? (
          <ul className="cart-line__issues">
            {issues.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
};

CartLineItem.propTypes = {
  item: PropTypes.object.isRequired,
  meta: PropTypes.object,
  busy: PropTypes.bool,
  removing: PropTypes.bool,
  onQuantityChange: PropTypes.func.isRequired,
  onSizeChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default CartLineItem;
