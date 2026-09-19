import { useMemo, useState } from "react";
import { Modal } from "react-bootstrap";

/**
 * Storefront size chart modal.
 *
 * Renders the admin-managed PRODUCT-level `sizeChart` (columns + rows) with a
 * CM / INCHES toggle. All values are stored in CENTIMETRES on the server; this
 * component handles unit conversion at render time.
 *
 * Shape expected:
 *   chart = {
 *     sizes: [{ value: "s", label: "S" }, ...],
 *     rows:  [{ code, label: "LENGTH", values: { s: 116.84, ... } }, ...]
 *   }
 */

const CM_TO_INCH = 0.393701;

const formatValue = (rawCm, unit) => {
  const cm = Number(rawCm);
  if (!Number.isFinite(cm) || cm <= 0) return "—";
  if (unit === "in") {
    const inches = cm * CM_TO_INCH;
    return inches.toFixed(2);
  }
  return cm.toFixed(2);
};

const SizeChartModal = ({ show, onHide, chart }) => {
  const [unit, setUnit] = useState("cm");

  const columns = useMemo(() => {
    const sizes = Array.isArray(chart?.sizes) ? chart.sizes : [];
    return sizes
      .map((row) => ({
        value: String(row?.value || "").trim().toLowerCase(),
        label:
          String(row?.label || row?.value || "").trim().toUpperCase() ||
          String(row?.value || "").toUpperCase(),
      }))
      .filter((col) => col.value);
  }, [chart]);

  const cleanRows = useMemo(() => {
    const rows = Array.isArray(chart?.rows) ? chart.rows : [];
    return rows.filter(
      (row) => row && String(row?.label || "").trim().length > 0,
    );
  }, [chart]);

  return (
    <Modal
      show={Boolean(show)}
      onHide={onHide}
      centered
      size="lg"
      dialogClassName="size-chart-modal"
      contentClassName="size-chart-modal__content"
      backdropClassName="size-chart-modal__backdrop"
    >
      <div className="size-chart-modal__header">
        <h2 className="size-chart-modal__title">Size Chart</h2>
        <div
          className="size-chart-modal__unit"
          role="group"
          aria-label="Size chart unit"
        >
          <button
            type="button"
            className={`size-chart-modal__unit-btn${
              unit === "cm" ? " size-chart-modal__unit-btn--active" : ""
            }`}
            onClick={() => setUnit("cm")}
            aria-pressed={unit === "cm"}
          >
            CM
          </button>
          <span className="size-chart-modal__unit-divider" aria-hidden="true" />
          <button
            type="button"
            className={`size-chart-modal__unit-btn${
              unit === "in" ? " size-chart-modal__unit-btn--active" : ""
            }`}
            onClick={() => setUnit("in")}
            aria-pressed={unit === "in"}
          >
            INCHES
          </button>
        </div>
        <button
          type="button"
          className="size-chart-modal__close"
          onClick={onHide}
          aria-label="Close size chart"
        >
          ×
        </button>
      </div>

      <div className="size-chart-modal__body">
        {cleanRows.length === 0 || columns.length === 0 ? (
          <p className="size-chart-modal__empty">
            Size chart not available for this product.
          </p>
        ) : (
          <div className="size-chart-modal__table-wrap">
            <table className="size-chart-modal__table">
              <thead>
                <tr>
                  <th scope="col" aria-label="Measurement" />
                  {columns.map((col) => (
                    <th key={`sc-col-${col.value}`} scope="col">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cleanRows.map((row, rowIndex) => (
                  <tr key={`sc-row-${row?.code || rowIndex}`}>
                    <th scope="row">{String(row?.label || "").toUpperCase()}</th>
                    {columns.map((col) => (
                      <td key={`sc-cell-${rowIndex}-${col.value}`}>
                        {formatValue(row?.values?.[col.value], unit)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SizeChartModal;
