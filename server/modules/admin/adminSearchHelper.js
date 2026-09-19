const mongoose = require("mongoose");

/**
 * Generate MongoDB query filters for search and filtering.
 * @param {Array} filters - Array of filter field keys (e.g. ['name', 'status'])
 * @param {Object} query - Object with search/filter criteria
 * @returns {Object} MongoDB filter object
 */
const processSearchFilters = (filters, query) => {
  const filtersSearchArgs = {};
  const filtersFilterArgs = {};
  const orSearch = [];
  const andFilter = [];

  // Sanity check
  if (!Array.isArray(filters) || typeof query !== "object") return {};

  const processSearchItem = (key, filter) => {
    const { value, type } = filter;
    if (!value || !type) return {};

    switch (type) {
      case "id":
        if (mongoose.Types.ObjectId.isValid(value)) {
          return { [key]: new mongoose.Types.ObjectId(value) };
        }
        return {};
      case "Number":
        return { [key]: parseInt(value) };
      case "String":
        return { [key]: { $regex: new RegExp(value, "i") } };
      case "Array":
        return { [key]: { $in: Array.isArray(value) ? value : [value] } };
      default:
        return {};
    }
  };

  const processFilterItem = (key, filter) => {
    const { value, type } = filter;
    if (!value || !type) return {};

    switch (type) {
      case "id":
        if (mongoose.Types.ObjectId.isValid(value)) {
          return { [key]: new mongoose.Types.ObjectId(value) };
        }
        return {};
      case "Number":
        return { [key]: parseInt(value) };
      case "String":
        return { [key]: value.toString() };
      case "Date":
        // Support both "|" separator (new) and " - " separator (old) for backward compatibility
        let dateParts;
        if (value.includes("|")) {
          dateParts = value.split("|");
        } else if (value.includes(" - ")) {
          dateParts = value.split(" - ");
        } else {
          // Fallback: try to split by last occurrence of space-dash-space pattern
          const lastDashIndex = value.lastIndexOf(" - ");
          if (lastDashIndex !== -1) {
            dateParts = [
              value.substring(0, lastDashIndex),
              value.substring(lastDashIndex + 3),
            ];
          } else {
            // If no separator found, treat as single date
            dateParts = [value, value];
          }
        }

        const startDateStr = dateParts[0]?.trim();
        const endDateStr = dateParts[1]?.trim();

        if (!startDateStr || !endDateStr) return {};

        // Parse dates - if date-only format (YYYY-MM-DD), add time
        let start, end;

        if (
          startDateStr &&
          !startDateStr.includes(":") &&
          !startDateStr.includes("T")
        ) {
          // Date-only format, set to start of day (00:00:00 UTC)
          start = new Date(startDateStr + "T00:00:00.000Z");
        } else {
          start = new Date(startDateStr);
        }

        if (
          endDateStr &&
          !endDateStr.includes(":") &&
          !endDateStr.includes("T")
        ) {
          // Date-only format, set to end of day (23:59:59.999 UTC)
          end = new Date(endDateStr + "T23:59:59.999Z");
        } else {
          end = new Date(endDateStr);
        }

        // Validate dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.error("Invalid date range:", {
            startDateStr,
            endDateStr,
            start,
            end,
          });
          return {};
        }

        return {
          [key]: {
            $gte: start,
            $lte: end,
          },
        };
      case "Boolean":
        return { [key]: value === "1" || value === true };
      default:
        return {};
    }
  };

  filters.forEach((key) => {
    if (key === "search" && query[key]) {
      const searchGroup = query[key];
      if (typeof searchGroup === "object") {
        for (let searchKey in searchGroup) {
          const searchCondition = processSearchItem(
            searchKey,
            searchGroup[searchKey],
          );
          if (Object.keys(searchCondition).length > 0) {
            orSearch.push(searchCondition);
          }
        }
      }
    } else if (query[key]) {
      const filterCondition = processFilterItem(key, query[key]);
      if (Object.keys(filterCondition).length > 0) {
        andFilter.push(filterCondition);
      }
    }
  });

  if (orSearch.length) filtersSearchArgs.$or = orSearch;
  if (andFilter.length) filtersFilterArgs.$and = andFilter;

  return { ...filtersSearchArgs, ...filtersFilterArgs };
};

module.exports = { processSearchFilters };
