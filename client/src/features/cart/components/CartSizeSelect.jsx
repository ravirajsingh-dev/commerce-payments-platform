import { useCallback, useMemo } from "react";
import PropTypes from "prop-types";

import CustomSelect from "@src/components/common/CustomSelect";
import { formatCartSizeLabel } from "../cartDisplayHelpers";

const toSelectOptions = (options = []) =>
  options.map((option) => ({
    value: option.value,
    label:
      option.stock <= 0
        ? `${option.label} — Out of stock`
        : option.label,
    isDisabled: option.stock <= 0,
  }));

const CartSizeSelect = ({
  value,
  options = [],
  disabled = false,
  busy = false,
  onChange,
  label = "Size",
}) => {
  const selectOptions = useMemo(() => toSelectOptions(options), [options]);

  const loadOptions = useCallback(
    async () => selectOptions,
    [selectOptions],
  );

  const selectedOption = useMemo(() => {
    const normalized = String(value || "").trim().toLowerCase();
    return (
      selectOptions.find((row) => row.value === normalized) ||
      selectOptions[0] ||
      null
    );
  }, [selectOptions, value]);

  const handleChange = (option) => {
    const next = option?.value;
    const current = String(value || "").trim().toLowerCase();
    if (next && next !== current) {
      onChange(next);
    }
  };

  if (options.length === 0) {
    const display = formatCartSizeLabel(value);
    if (!display) return null;
    return (
      <div className="cart-line__attr">
        <span className="cart-line__attr-label">SIZE:</span>
        <span className="cart-line__attr-value">{display}</span>
      </div>
    );
  }

  if (options.length === 1) {
    const only = options[0];
    return (
      <div className="cart-line__attr">
        <span className="cart-line__attr-label">SIZE:</span>
        <span className="cart-line__attr-value">{only.label}</span>
      </div>
    );
  }

  return (
    <div className="cart-line__attr cart-line__attr--size">
      <span className="cart-line__attr-label" id={`cart-size-label-${value || "line"}`}>
        SIZE:
      </span>
      <div
        className={`cart-size-select${busy ? " cart-size-select--busy" : ""}`}
        role="group"
        aria-label={label}
        aria-busy={busy || undefined}
      >
        <CustomSelect
          key={selectOptions.map((row) => row.value).join("|")}
          className="cart-size-select__custom"
          value={selectedOption}
          onChange={handleChange}
          loadOptions={loadOptions}
          isDisabled={disabled || busy}
          isRequired
          placeholder="Size"
          inputUppercase
        />
      </div>
    </div>
  );
};

CartSizeSelect.propTypes = {
  value: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      stock: PropTypes.number,
    }),
  ),
  disabled: PropTypes.bool,
  busy: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
};

export default CartSizeSelect;
