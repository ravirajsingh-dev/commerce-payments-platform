import PropTypes from "prop-types";

import CartQuantityStepper from "./CartQuantityStepper";
import CartSizeSelect from "./CartSizeSelect";

/**
 * Two-row spec layout: attributes (2 per row) + size | qty (2 per row).
 * Attribute list is dynamic (any catalog fields).
 */
const CartLineSpecGrid = ({
  attributes = [],
  hasSize = false,
  sizeValue,
  sizeOptions,
  sizeDisabled = false,
  sizeBusy = false,
  onSizeChange,
  sizeLabel,
  quantity,
  quantityMin = 1,
  quantityMax = 99,
  quantityDisabled = false,
  quantityBusy = false,
  onQuantityChange,
  quantityLabel,
}) => (
  <div className="cart-line__spec-stack">
    {attributes.length > 0 ? (
      <ul className="cart-line__attrs" aria-label="Product options">
        {attributes.map((attr) => (
          <li key={attr.code} className="cart-line__attr">
            <span className="cart-line__attr-label">{attr.label}:</span>
            <span className="cart-line__attr-value" title={attr.value}>
              {attr.value}
            </span>
          </li>
        ))}
      </ul>
    ) : null}

    <div
      className={`cart-line__spec-actions${hasSize ? "" : " cart-line__spec-actions--qty-only"}`}
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

      <div className="cart-line__spec-divider" aria-hidden="true" />

      <div className="cart-line__qty">
        <span className="cart-line__attr-label">QTY:</span>
        <CartQuantityStepper
          value={quantity}
          min={quantityMin}
          max={quantityMax}
          disabled={quantityDisabled}
          busy={quantityBusy}
          compact
          onChange={onQuantityChange}
          label={quantityLabel}
        />
      </div>
    </div>
  </div>
);

CartLineSpecGrid.propTypes = {
  attributes: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    }),
  ),
  hasSize: PropTypes.bool,
  sizeValue: PropTypes.string,
  sizeOptions: PropTypes.array,
  sizeDisabled: PropTypes.bool,
  sizeBusy: PropTypes.bool,
  onSizeChange: PropTypes.func,
  sizeLabel: PropTypes.string,
  quantity: PropTypes.number.isRequired,
  quantityMin: PropTypes.number,
  quantityMax: PropTypes.number,
  quantityDisabled: PropTypes.bool,
  quantityBusy: PropTypes.bool,
  onQuantityChange: PropTypes.func.isRequired,
  quantityLabel: PropTypes.string,
};

export default CartLineSpecGrid;
