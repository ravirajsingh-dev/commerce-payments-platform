const ERROR_CODES = Object.freeze({
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  UNAUTHORIZED: "UNAUTHORIZED",
  RESOURCE_GONE: "RESOURCE_GONE",
  VALIDATION_ERROR: "VALIDATION_ERROR",
});

const statusCodeToErrorCode = (statusCode = 400) => {
  if (statusCode >= 500) return ERROR_CODES.INTERNAL_SERVER_ERROR;
  if (statusCode === 429) return ERROR_CODES.RATE_LIMITED;
  if (statusCode === 404) return ERROR_CODES.NOT_FOUND;
  if (statusCode === 403) return ERROR_CODES.FORBIDDEN;
  if (statusCode === 401) return ERROR_CODES.UNAUTHORIZED;
  if (statusCode === 410) return ERROR_CODES.RESOURCE_GONE;
  return ERROR_CODES.VALIDATION_ERROR;
};

module.exports = {
  ERROR_CODES,
  statusCodeToErrorCode,
};
