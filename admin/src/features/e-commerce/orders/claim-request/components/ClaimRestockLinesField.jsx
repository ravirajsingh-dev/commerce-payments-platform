import PropTypes from "prop-types";
import { Form } from "react-bootstrap";

const ClaimRestockLinesField = ({
  orderItems = [],
  restockLines = [],
  onChange,
  adminConfirmQc = false,
  onAdminConfirmQcChange,
  disabled = false,
}) => {
  const items = Array.isArray(orderItems) ? orderItems : [];
  if (!items.length) {
    return null;
  }

  const requiresQcForSelection = restockLines.some((line) => {
    const item = items.find((row) => row.orderItemId === line.orderItemId);
    return item?.claimPolicySnapshot?.restockPolicy?.requireQcForRestock !== false;
  });

  const toggleItem = (orderItemId, maxQty, requiresConfirm) => {
    const existing = restockLines.find((row) => row.orderItemId === orderItemId);
    if (existing) {
      onChange(restockLines.filter((row) => row.orderItemId !== orderItemId));
      return;
    }
    onChange([
      ...restockLines,
      {
        orderItemId,
        quantity: maxQty,
        adminConfirmRestock: requiresConfirm ? false : undefined,
      },
    ]);
  };

  const updateLine = (orderItemId, patch) => {
    onChange(
      restockLines.map((row) =>
        row.orderItemId === orderItemId ? { ...row, ...patch } : row,
      ),
    );
  };

  return (
    <div className="claim-restock-lines">
      <p className="claim-restock-lines__title">Restock inventory (optional)</p>
      <p className="claim-restock-lines__hint">
        Select items to return to stock when completing this claim.
      </p>
      <ul className="claim-restock-lines__list">
        {items.map((item) => {
          const orderItemId = item.orderItemId;
          const selected = restockLines.find((row) => row.orderItemId === orderItemId);
          const bespokeNonRestockable =
            item?.claimPolicySnapshot?.restockPolicy?.bespokeNonRestockableByDefault === true;
          const label = item.productNameSnapshot || "Order item";
          const sizeLabel = item.size ? ` · ${item.size}` : "";

          return (
            <li key={orderItemId} className="claim-restock-lines__item">
              <Form.Check
                type="checkbox"
                id={`restock-${orderItemId}`}
                label={`${label}${sizeLabel} · Qty ${item.quantity}`}
                checked={Boolean(selected)}
                onChange={() => toggleItem(orderItemId, item.quantity, bespokeNonRestockable)}
                disabled={disabled}
              />
              {selected ? (
                <div className="claim-restock-lines__controls">
                  <Form.Group className="claim-restock-lines__qty">
                    <Form.Label className="form-sub-label">Restock qty</Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={selected.quantity}
                      onChange={(e) =>
                        updateLine(orderItemId, {
                          quantity: Math.min(
                            Math.max(parseInt(e.target.value, 10) || 1, 1),
                            item.quantity,
                          ),
                        })
                      }
                      disabled={disabled}
                    />
                  </Form.Group>
                  {bespokeNonRestockable ? (
                    <Form.Check
                      type="checkbox"
                      id={`restock-confirm-${orderItemId}`}
                      className="claim-restock-lines__confirm"
                      label="Confirm bespoke item can be restocked"
                      checked={selected.adminConfirmRestock === true}
                      onChange={(e) =>
                        updateLine(orderItemId, { adminConfirmRestock: e.target.checked })
                      }
                      disabled={disabled}
                    />
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {requiresQcForSelection ? (
        <Form.Check
          type="checkbox"
          id="claim-restock-qc-confirm"
          className="claim-restock-lines__confirm mt-2"
          label="Confirm QC passed for selected restock lines"
          checked={adminConfirmQc}
          onChange={(e) => onAdminConfirmQcChange?.(e.target.checked)}
          disabled={disabled}
        />
      ) : null}
    </div>
  );
};

ClaimRestockLinesField.propTypes = {
  orderItems: PropTypes.array,
  restockLines: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  adminConfirmQc: PropTypes.bool,
  onAdminConfirmQcChange: PropTypes.func,
  disabled: PropTypes.bool,
};

export default ClaimRestockLinesField;
