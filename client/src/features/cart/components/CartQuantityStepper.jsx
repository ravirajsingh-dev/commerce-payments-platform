import PropTypes from "prop-types";
import { FaMinus, FaPlus } from "react-icons/fa";

const CartQuantityStepper = ({
  value,
  min = 1,
  max = 99,
  disabled = false,
  busy = false,
  compact = false,
  onChange,
  label,
}) => {
  const canDecrease = !disabled && !busy && value > min;
  const canIncrease = !disabled && !busy && value < max;

  return (
    <div
      className={[
        "cart-stepper",
        busy ? "cart-stepper--busy" : "",
        compact ? "cart-stepper--compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label || "Quantity"}
    >
      <button
        type="button"
        className="cart-stepper__btn"
        onClick={() => canDecrease && onChange(value - 1)}
        disabled={!canDecrease}
        aria-label="Decrease quantity"
      >
        <FaMinus aria-hidden />
      </button>
      <span className="cart-stepper__value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="cart-stepper__btn"
        onClick={() => canIncrease && onChange(value + 1)}
        disabled={!canIncrease}
        aria-label="Increase quantity"
      >
        <FaPlus aria-hidden />
      </button>
    </div>
  );
};

CartQuantityStepper.propTypes = {
  value: PropTypes.number.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  disabled: PropTypes.bool,
  busy: PropTypes.bool,
  compact: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
};

export default CartQuantityStepper;
