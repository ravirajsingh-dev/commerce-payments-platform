import { useState } from "react";
import { Button, Form } from "react-bootstrap";

/**
 * Dynamic, admin-managed PRODUCT-level size chart editor.
 *
 * The chart is OPTIONAL — products that don't need one (belts, pocket squares,
 * stoles, etc.) simply leave it empty and the storefront skips the link.
 *
 * Shape:
 *   chart = {
 *     sizes: [{ value: "s", label: "S" }, ...],   // admin-defined columns
 *     rows:  [{ code, label: "LENGTH", values: { s: 116.84, m: 116.84, ... } }, ...]
 *   }
 *
 * The component is fully controlled — `chart` and `onChange` come from the parent
 * page so the chart payload survives sibling form edits.
 */

const MAX_ROWS = 40;
const MAX_LABEL_LENGTH = 80;
const MAX_VALUE = 999.99;
const MAX_SIZE_COLUMNS = 25;
const COMMON_SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

const slugifySizeValue = (raw) =>
  String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

const slugifyRowCode = (raw) =>
  String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

const sanitizeMeasurement = (raw) => {
  if (raw === undefined || raw === null || raw === "") return "";
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) return "";
  if (num > MAX_VALUE) return MAX_VALUE;
  return Math.round(num * 100) / 100;
};

const buildEmptyRow = (existingRows = [], suggestedLabel = "") => {
  const usedCodes = new Set(existingRows.map((row) => row?.code).filter(Boolean));
  const label = String(suggestedLabel || "").trim();
  const base = slugifyRowCode(label) || `row_${existingRows.length + 1}`;
  let code = base;
  let suffix = 2;
  while (usedCodes.has(code)) {
    code = `${base}_${suffix}`;
    suffix += 1;
  }
  return { code, label, values: {} };
};

const ProductSizeChart = ({ chart, onChange }) => {
  const sizes = Array.isArray(chart?.sizes) ? chart.sizes : [];
  const rows = Array.isArray(chart?.rows) ? chart.rows : [];

  const [newSizeLabel, setNewSizeLabel] = useState("");
  const [newRowLabel, setNewRowLabel] = useState("");

  const emit = (next) => {
    if (typeof onChange === "function") onChange(next);
  };

  const sizeValues = new Set(sizes.map((row) => row.value));

  const handleAddSize = (rawLabel) => {
    const label = String(rawLabel || "").trim();
    if (!label) return;
    const value = slugifySizeValue(label);
    if (!value) return;
    if (sizeValues.has(value)) return;
    if (sizes.length >= MAX_SIZE_COLUMNS) return;
    const next = [
      ...sizes,
      { value, label: label.length <= 80 ? label : label.slice(0, 80) },
    ];
    emit({ sizes: next, rows });
    setNewSizeLabel("");
  };

  const handleAddSizeSubmit = (e) => {
    e?.preventDefault?.();
    handleAddSize(newSizeLabel);
  };

  const handleRemoveSize = (value) => {
    const nextSizes = sizes.filter((row) => row.value !== value);
    const prunedRows = rows.map((row) => {
      const values = { ...(row?.values || {}) };
      delete values[value];
      return { ...row, values };
    });
    emit({ sizes: nextSizes, rows: prunedRows });
  };

  const handleAddRow = (e) => {
    e?.preventDefault?.();
    const trimmed = newRowLabel.trim();
    if (!trimmed) return;
    if (rows.length >= MAX_ROWS) return;
    emit({ sizes, rows: [...rows, buildEmptyRow(rows, trimmed)] });
    setNewRowLabel("");
  };

  const handleRemoveRow = (rowIndex) => {
    emit({ sizes, rows: rows.filter((_, idx) => idx !== rowIndex) });
  };

  const handleLabelChange = (rowIndex, value) => {
    const next = rows.map((row, idx) =>
      idx === rowIndex
        ? { ...row, label: String(value).slice(0, MAX_LABEL_LENGTH) }
        : row,
    );
    emit({ sizes, rows: next });
  };

  const handleCellChange = (rowIndex, sizeValue, raw) => {
    const cleaned = sanitizeMeasurement(raw);
    const next = rows.map((row, idx) => {
      if (idx !== rowIndex) return row;
      const values = { ...(row?.values || {}) };
      if (cleaned === "") {
        delete values[sizeValue];
      } else {
        values[sizeValue] = cleaned;
      }
      return { ...row, values };
    });
    emit({ sizes, rows: next });
  };

  const handleClearAll = () => {
    emit({ sizes: [], rows: [] });
    setNewSizeLabel("");
    setNewRowLabel("");
  };

  return (
    <div className="pv-size-chart">
      <div className="pv-size-chart__block">
        <div className="pv-size-chart__block-head">
          <span className="pv-size-chart__block-title">
            1. Sizes (columns)
          </span>
          <span className="pv-size-chart__block-hint">
            Add any sizes you sell: XS, S, M, L, XL, XXL, XXXL, FREE SIZE...
          </span>
        </div>

        <div className="pv-size-chart__chips">
          {sizes.length === 0 ? (
            <span className="pv-size-chart__chips-empty">
              No sizes added yet.
            </span>
          ) : (
            sizes.map((col) => (
              <span key={`pv-sc-size-${col.value}`} className="pv-size-chart__chip">
                <span className="pv-size-chart__chip-label">
                  {col.label || col.value.toUpperCase()}
                </span>
                <button
                  type="button"
                  className="pv-size-chart__chip-remove"
                  onClick={() => handleRemoveSize(col.value)}
                  aria-label={`Remove size ${col.label || col.value}`}
                  title="Remove size"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>

        <div className="pv-size-chart__add">
          <Form.Control
            type="text"
            className="pv-size-chart__add-input"
            value={newSizeLabel}
            onChange={(e) => setNewSizeLabel(e.target.value)}
            placeholder="Type a size and press Enter (e.g. XL)"
            maxLength={24}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSizeSubmit(e);
            }}
          />
          <Button
            type="button"
            className="btn btn--theme btn--disabled-theme"
            onClick={handleAddSizeSubmit}
            disabled={
              !newSizeLabel.trim() ||
              sizes.length >= MAX_SIZE_COLUMNS ||
              sizeValues.has(slugifySizeValue(newSizeLabel))
            }
          >
            + Add Size
          </Button>
        </div>

        <div className="pv-size-chart__presets">
          <span className="pv-size-chart__presets-label">Quick add:</span>
          {COMMON_SIZE_PRESETS.map((preset) => {
            const value = slugifySizeValue(preset);
            const alreadyAdded = sizeValues.has(value);
            return (
              <button
                key={`pv-sc-preset-${preset}`}
                type="button"
                className={`pv-size-chart__preset${
                  alreadyAdded ? " pv-size-chart__preset--disabled" : ""
                }`}
                onClick={() => handleAddSize(preset)}
                disabled={alreadyAdded || sizes.length >= MAX_SIZE_COLUMNS}
                title={alreadyAdded ? "Already added" : `Add ${preset}`}
              >
                {preset}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pv-size-chart__block">
        <div className="pv-size-chart__block-head">
          <span className="pv-size-chart__block-title">
            2. Measurements (rows)
          </span>
          <span className="pv-size-chart__block-hint">
            Add any measurements: LENGTH, CHEST, TUMMY, HIP, COLLAR, SHOULDER,
            SLV. LENGTH, BICEP, ARMHOLE...
          </span>
        </div>

        {sizes.length === 0 ? (
          <p className="small text-light opacity-75 mb-0 pv-size-chart__locked">
            Add at least one size above to start adding measurement rows.
          </p>
        ) : (
          <>
            <div className="pv-size-chart__add">
              <Form.Control
                type="text"
                className="pv-size-chart__add-input"
                value={newRowLabel}
                onChange={(e) => setNewRowLabel(e.target.value)}
                placeholder="Type a measurement and press Enter (e.g. LENGTH)"
                maxLength={MAX_LABEL_LENGTH}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddRow(e);
                }}
              />
              <Button
                type="button"
                className="btn btn--theme btn--disabled-theme"
                onClick={handleAddRow}
                disabled={!newRowLabel.trim() || rows.length >= MAX_ROWS}
              >
                + Add Row
              </Button>
              {rows.length > 0 || sizes.length > 0 ? (
                <Button
                  type="button"
                  className="btn btn--outline"
                  onClick={handleClearAll}
                >
                  Clear Chart
                </Button>
              ) : null}
            </div>

            {rows.length === 0 ? (
              <p className="small text-light opacity-75 mb-0 mt-2">
                No measurements yet. Add a row like &quot;LENGTH&quot; above.
              </p>
            ) : (
              <div className="pv-size-chart__table-wrap mt-2">
                <table className="pv-size-chart__table">
                  <thead>
                    <tr>
                      <th scope="col" className="pv-size-chart__th--measure">
                        Measurement (cm)
                      </th>
                      {sizes.map((col) => (
                        <th key={`pv-sc-col-${col.value}`} scope="col">
                          {col.label || col.value.toUpperCase()}
                        </th>
                      ))}
                      <th
                        scope="col"
                        className="pv-size-chart__th--action"
                        aria-label="Actions"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={`pv-sc-row-${row?.code || rowIndex}`}>
                        <th scope="row" className="pv-size-chart__row-label">
                          <Form.Control
                            type="text"
                            value={row?.label || ""}
                            onChange={(e) =>
                              handleLabelChange(rowIndex, e.target.value)
                            }
                            placeholder="LABEL"
                            maxLength={MAX_LABEL_LENGTH}
                          />
                        </th>
                        {sizes.map((col) => {
                          const cell = row?.values?.[col.value];
                          return (
                            <td key={`pv-sc-cell-${rowIndex}-${col.value}`}>
                              <Form.Control
                                type="number"
                                min={0}
                                step="0.01"
                                inputMode="decimal"
                                value={
                                  cell === undefined || cell === null ? "" : cell
                                }
                                onChange={(e) =>
                                  handleCellChange(
                                    rowIndex,
                                    col.value,
                                    e.target.value,
                                  )
                                }
                                placeholder="—"
                              />
                            </td>
                          );
                        })}
                        <td className="pv-size-chart__row-action">
                          <button
                            type="button"
                            className="pv-size-chart__remove-btn"
                            onClick={() => handleRemoveRow(rowIndex)}
                            aria-label={`Remove ${row?.label || "row"}`}
                            title="Remove row"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductSizeChart;
