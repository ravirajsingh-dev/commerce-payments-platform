/**
 * Helpers for the admin-managed, product-level size chart.
 *
 * Storage shape (on the product document):
 *
 *   sizeChart: {
 *     sizes: [{ value: "s", label: "S" }, ...],          // admin-defined columns
 *     rows:  [
 *       { code: "length", label: "LENGTH", values: { s: 116.84, m: 116.84, ... } },
 *       { code: "chest",  label: "CHEST",  values: { s: 111.76, m: 116.84, ... } },
 *     ],
 *   }
 *
 * The chart is OPTIONAL — products that don't need one (belts, pocket squares, etc.)
 * simply persist `{ sizes: [], rows: [] }` and no link is shown on the storefront.
 *
 * Conventions:
 *   - All measurement values are stored in CENTIMETRES (numbers). The storefront
 *     toggles to inches at render time.
 *   - Row order is preserved as the admin entered it.
 *   - `value` keys on both columns and row cells are slugified (lowercase, ascii).
 *   - `code` is a stable slug auto-derived from `label` when missing; used so the
 *     storefront can re-order columns without losing row identity.
 */

const MAX_SIZE_COLUMNS = 25;
const MAX_ROWS = 40;
const MAX_LABEL = 80;
const MAX_DECIMALS = 2;
const MAX_VALUE = 999.99;

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

const normalizeMeasurement = (raw) => {
  if (raw === undefined || raw === null || raw === "") return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) return null;
  const capped = Math.min(num, MAX_VALUE);
  return Math.round(capped * 10 ** MAX_DECIMALS) / 10 ** MAX_DECIMALS;
};

const normalizeSizes = (sizes = []) => {
  if (!Array.isArray(sizes)) return [];
  const seen = new Set();
  const cleaned = [];
  for (const row of sizes) {
    if (!row || typeof row !== "object") continue;
    const value = slugifySizeValue(row.value || row.label);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const label =
      String(row.label || row.value || "").trim().slice(0, MAX_LABEL) ||
      value.toUpperCase();
    cleaned.push({ value, label });
    if (cleaned.length >= MAX_SIZE_COLUMNS) break;
  }
  return cleaned;
};

const normalizeRows = (rows = [], allowedSizes = []) => {
  if (!Array.isArray(rows)) return [];
  const allowed = new Set(
    (allowedSizes || [])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean),
  );
  const seenCodes = new Set();
  const cleaned = [];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const label = String(row.label || "").trim().slice(0, MAX_LABEL);
    if (!label) continue;

    let code = slugifyRowCode(row.code || label);
    if (!code) code = `row_${cleaned.length + 1}`;
    const baseCode = code;
    let suffix = 2;
    while (seenCodes.has(code)) {
      code = `${baseCode}_${suffix}`;
      suffix += 1;
    }
    seenCodes.add(code);

    const valuesSource =
      row.values && typeof row.values === "object"
        ? row.values instanceof Map
          ? Object.fromEntries(row.values)
          : row.values
        : {};

    const valuesOut = {};
    Object.entries(valuesSource).forEach(([sizeKey, raw]) => {
      const key = String(sizeKey || "").trim().toLowerCase();
      if (!key) return;
      if (allowed.size > 0 && !allowed.has(key)) return;
      const value = normalizeMeasurement(raw);
      if (value === null) return;
      valuesOut[key] = value;
    });

    cleaned.push({ code, label, values: valuesOut });
    if (cleaned.length >= MAX_ROWS) break;
  }

  return cleaned;
};

/**
 * Normalises an admin-submitted full size chart payload.
 *
 * @param {Object|null} chart Admin-supplied `{ sizes, rows }` shape (or array fallback for
 *   legacy callers — treated as rows only).
 * @returns {{ sizes: Array, rows: Array }} Cleaned chart ready to persist.
 */
const normalizeSizeChart = (chart) => {
  if (!chart) return { sizes: [], rows: [] };
  // Tolerate the legacy `rows[]` shape too so old payloads don't 500.
  if (Array.isArray(chart)) {
    return { sizes: [], rows: normalizeRows(chart, []) };
  }
  if (typeof chart !== "object") return { sizes: [], rows: [] };
  const sizes = normalizeSizes(chart.sizes);
  const rows = normalizeRows(
    chart.rows,
    sizes.map((row) => row.value),
  );
  return { sizes, rows };
};

/**
 * Converts a Mongoose-shaped sizeChart document into a fully plain JSON-friendly object.
 * Handles Map -> plain object normalisation for nested `values`.
 */
const sizeChartToPlain = (chart) => {
  if (!chart) return { sizes: [], rows: [] };
  const sizesRaw = Array.isArray(chart.sizes) ? chart.sizes : [];
  const sizes = sizesRaw
    .map((row) => ({
      value: String(row?.value || "").trim().toLowerCase(),
      label: String(row?.label || "").trim(),
    }))
    .filter((row) => row.value);

  const rowsRaw = Array.isArray(chart.rows) ? chart.rows : [];
  const rows = rowsRaw.map((row) => {
    const valuesSource = row?.values;
    let values = {};
    if (valuesSource instanceof Map) {
      valuesSource.forEach((value, key) => {
        const num = Number(value);
        if (Number.isFinite(num)) values[String(key)] = num;
      });
    } else if (valuesSource && typeof valuesSource === "object") {
      values = Object.fromEntries(
        Object.entries(valuesSource)
          .map(([k, v]) => [String(k), Number(v)])
          .filter(([, v]) => Number.isFinite(v)),
      );
    }
    return {
      code: String(row?.code || "").trim().toLowerCase(),
      label: String(row?.label || "").trim(),
      values,
    };
  });
  return { sizes, rows };
};

/**
 * Cheap structural validator usable as an express-validator `.custom()` rule.
 * Accepts either a JSON string or an already-parsed object/array. Empty chart is OK.
 */
const isValidSizeChartPayload = (input) => {
  if (input === undefined || input === null || input === "") return true;
  let parsed;
  try {
    parsed = typeof input === "string" ? JSON.parse(input) : input;
  } catch (e) {
    return false;
  }
  if (parsed === null) return true;
  // Legacy: bare rows array — still allowed during transition.
  if (Array.isArray(parsed)) {
    return parsed.length <= MAX_ROWS && parsed.every(rowIsStructurallyValid);
  }
  if (typeof parsed !== "object") return false;

  const sizes = parsed.sizes;
  if (sizes !== undefined && sizes !== null) {
    if (!Array.isArray(sizes)) return false;
    if (sizes.length > MAX_SIZE_COLUMNS) return false;
    if (
      !sizes.every(
        (row) =>
          row &&
          typeof row === "object" &&
          (String(row.value || row.label || "").trim().length > 0),
      )
    ) {
      return false;
    }
  }

  const rows = parsed.rows;
  if (rows !== undefined && rows !== null) {
    if (!Array.isArray(rows)) return false;
    if (rows.length > MAX_ROWS) return false;
    if (!rows.every(rowIsStructurallyValid)) return false;
  }
  return true;
};

const rowIsStructurallyValid = (row) => {
  if (!row || typeof row !== "object") return false;
  if (!String(row.label || "").trim()) return false;
  if (row.values !== undefined && row.values !== null) {
    if (typeof row.values !== "object") return false;
    const entries = row.values instanceof Map
      ? Array.from(row.values.entries())
      : Object.entries(row.values);
    return entries.every(([k, v]) => {
      if (!String(k || "").trim()) return false;
      if (v === undefined || v === null || v === "") return true;
      const num = Number(v);
      return Number.isFinite(num) && num >= 0;
    });
  }
  return true;
};

module.exports = {
  MAX_SIZE_CHART_ROWS: MAX_ROWS,
  MAX_SIZE_CHART_COLUMNS: MAX_SIZE_COLUMNS,
  MAX_SIZE_CHART_LABEL: MAX_LABEL,
  slugifySizeValue,
  slugifyRowCode,
  normalizeSizeChart,
  sizeChartToPlain,
  isValidSizeChartPayload,
};
