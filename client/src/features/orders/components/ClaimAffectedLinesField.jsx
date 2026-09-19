import PropTypes from "prop-types";
import { Form } from "react-bootstrap";

const ClaimAffectedLinesField = ({
  items,
  selectedLines,
  onChange,
  disabled = false,
}) => {
  const orderItems = Array.isArray(items) ? items : [];
  if (orderItems.length <= 1) {
    return null;
  }

  const toggleItem = (orderItemId, maxQty) => {
    const existing = selectedLines.find((row) => row.orderItemId === orderItemId);
    if (existing) {
      onChange(selectedLines.filter((row) => row.orderItemId !== orderItemId));
      return;
    }
    onChange([...selectedLines, { orderItemId, quantity: maxQty, note: "" }]);
  };

  const updateQuantity = (orderItemId, quantity, maxQty) => {
    const parsed = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), maxQty);
    onChange(
      selectedLines.map((row) =>
        row.orderItemId === orderItemId ? { ...row, quantity: parsed } : row,
      ),
    );
  };

  return (
    <div className="order-claim-affected-lines">
      <p className="order-claim-affected-lines__title">Items to include</p>
      <p className="order-claim-affected-lines__hint">
        Select specific items, or leave all unchecked to claim the whole order.
      </p>
      <ul className="order-claim-affected-lines__list">
        {orderItems.map((item) => {
          const orderItemId = item.orderItemId;
          const selected = selectedLines.find((row) => row.orderItemId === orderItemId);
          const label = item.productNameSnapshot || "Order item";
          const sizeLabel = item.size ? ` · Size ${item.size}` : "";
          const qtyLabel = item.quantity > 1 ? ` · Qty ${item.quantity}` : "";

          return (
            <li key={orderItemId} className="order-claim-affected-lines__item">
              <Form.Check
                type="checkbox"
                id={`claim-item-${orderItemId}`}
                label={`${label}${sizeLabel}${qtyLabel}`}
                checked={Boolean(selected)}
                onChange={() => toggleItem(orderItemId, item.quantity)}
                disabled={disabled}
              />
              {selected ? (
                <div className="order-claim-affected-lines__qty">
                  <Form.Label className="form-sub-label" htmlFor={`claim-qty-${orderItemId}`}>
                    Quantity
                  </Form.Label>
                  <Form.Control
                    id={`claim-qty-${orderItemId}`}
                    type="number"
                    min={1}
                    max={item.quantity}
                    value={selected.quantity}
                    onChange={(e) => updateQuantity(orderItemId, e.target.value, item.quantity)}
                    disabled={disabled}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

ClaimAffectedLinesField.propTypes = {
  items: PropTypes.array,
  selectedLines: PropTypes.arrayOf(
    PropTypes.shape({
      orderItemId: PropTypes.string.isRequired,
      quantity: PropTypes.number.isRequired,
      note: PropTypes.string,
    }),
  ).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ClaimAffectedLinesField;
