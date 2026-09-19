const parseDateBoundary = (value, endOfDay = false) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const date = new Date(`${raw}${suffix}`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const parseAnalyticsDateRange = (query = {}) => {
  const fromDate = parseDateBoundary(query.fromDate, false);
  const toDate = parseDateBoundary(query.toDate, true);

  if (query.fromDate && !fromDate) {
    return { ok: false, errors: [{ path: "fromDate", msg: "Invalid fromDate." }] };
  }
  if (query.toDate && !toDate) {
    return { ok: false, errors: [{ path: "toDate", msg: "Invalid toDate." }] };
  }
  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    return {
      ok: false,
      errors: [{ path: "toDate", msg: "toDate must be on or after fromDate." }],
    };
  }

  return {
    ok: true,
    fromDate,
    toDate,
    createdAtFilter: buildCreatedAtFilter(fromDate, toDate),
  };
};

const buildCreatedAtFilter = (fromDate, toDate) => {
  if (!fromDate && !toDate) return {};
  const createdAt = {};
  if (fromDate) createdAt.$gte = fromDate;
  if (toDate) createdAt.$lte = toDate;
  return { createdAt };
};

const normalizePeriod = (value) => {
  const key = String(value || "day").trim().toLowerCase();
  if (key === "week" || key === "month") return key;
  return "day";
};

const periodDateFormat = (period) => {
  if (period === "week") return "%G-W%V";
  if (period === "month") return "%Y-%m";
  return "%Y-%m-%d";
};

module.exports = {
  parseDateBoundary,
  parseAnalyticsDateRange,
  buildCreatedAtFilter,
  normalizePeriod,
  periodDateFormat,
};
