const { statusCodeToErrorCode } = require("../shared/contracts/apiContract");

module.exports = {
  statusCodeToErrorCode,
  successResponse: (
    res,
    data = {},
    message = "",
    statusCode = 200,
    status = true
  ) => {
    return res
      .status(statusCode)
      .json({ status: status, message: message, response: data });
  },

  errorResponse: (
    res,
    error = "",
    message = "Errors! Please correct the following errors and submit again.",
    statusCode = 400,
    status = false,
    options = {}
  ) => {
    // Normalize errors to always be an array
    let errorsArray = [];
    if (Array.isArray(error)) {
      errorsArray = error;
    } else if (error && typeof error === 'object') {
      // If it's an object like { msg: "..." }, convert to array
      errorsArray = [error];
    } else if (error) {
      // If it's a string or other value, convert to array with msg property
      errorsArray = [{ msg: String(error) }];
    }

    const payload = { status, message, errors: errorsArray };
    payload.code = options.code || statusCodeToErrorCode(statusCode);
    if (options.tokenStatus !== undefined) payload.tokenStatus = options.tokenStatus;

    res.status(statusCode).json(payload);
  },
};
