import PropTypes from "prop-types";
import { FaShoppingCart } from "react-icons/fa";

import CartSizeSelect from "@src/features/cart/components/CartSizeSelect";

const WishlistLineSpecGrid = ({
  attributes = [],
  hasSize = false,
  sizeValue,
  sizeOptions = [],
  sizeDisabled = false,
  sizeBusy = false,
  onSizeChange,
  sizeLabel,
  canAddToCart = false,
  adding = false,
  onAddToCart,
  addLabel = "Add to cart",
}) => (
  <div className="cart-line__spec-stack">
    {attributes.length > 0 ? (
      <ul className="cart-line__attrs" aria-label="Product details">
        {attributes.map((attr) => (
          <li
            key={attr.code}
            className={`cart-line__attr${
              attr.isStock && !attr.inStock ? " cart-line__attr--oos" : ""
            }`}
          >
            <span className="cart-line__attr-label">{attr.label}:</span>
            <span className="cart-line__attr-value" title={attr.value}>
              {attr.value}
            </span>
          </li>
        ))}
      </ul>
    ) : null}

    <div
      className={`cart-line__spec-actions wishlist-line__spec-actions${
        hasSize ? "" : " wishlist-line__spec-actions--add-only"
      }`}
    >
      {hasSize ? (
        <CartSizeSelect
          value={sizeValue}
          options={sizeOptions}
          disabled={sizeDisabled}
          busy={sizeBusy}
          label={sizeLabel}
          onChange={onSizeChange}
        />
      ) : null}

      {hasSize ? <div className="cart-line__spec-divider" aria-hidden="true" /> : null}

      <button
        type="button"
        className="wishlist-line__add-cart"
        onClick={onAddToCart}
        disabled={!canAddToCart || adding || sizeDisabled}
        aria-label={adding ? "Adding to cart" : addLabel}
        title={adding ? "Adding…" : addLabel}
      >
        <FaShoppingCart aria-hidden />
      </button>
    </div>
  </div>
);

WishlistLineSpecGrid.propTypes = {
  attributes: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      isStock: PropTypes.bool,
      inStock: PropTypes.bool,
    }),
  ),
  hasSize: PropTypes.bool,
  sizeValue: PropTypes.string,
  sizeOptions: PropTypes.array,
  sizeDisabled: PropTypes.bool,
  sizeBusy: PropTypes.bool,
  onSizeChange: PropTypes.func,
  sizeLabel: PropTypes.string,
  canAddToCart: PropTypes.bool,
  adding: PropTypes.bool,
  onAddToCart: PropTypes.func.isRequired,
  addLabel: PropTypes.string,
};

export default WishlistLineSpecGrid;
