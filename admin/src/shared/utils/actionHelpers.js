import { setErrorsList } from "@src/app/state/actions/errors";

export const JSON_HEADERS = {
  headers: {
    "Content-Type": "application/json",
  },
};

export const JSON_HEADERS_ALLOW_DUP = {
  ...JSON_HEADERS,
  allowDuplicates: true,
};

export const runAsyncAction = async ({ execute, onError }) => {
  try {
    return await execute();
  } catch (error) {
    if (onError) return onError(error);
    throw error;
  }
};

export const normalizeApiError = (error, fallbackMessage = "Something went wrong") => {
  const data = error?.response?.data;
  const firstErrorMessage = Array.isArray(data?.errors)
    ? data.errors.find((item) => item?.msg || item?.message)?.msg ||
      data.errors.find((item) => item?.msg || item?.message)?.message
    : "";
  return {
    status: error?.response?.status,
    message: firstErrorMessage || data?.message || error?.message || fallbackMessage,
    errors: Array.isArray(data?.errors) ? data.errors : [],
    raw: error,
  };
};

export const getApiErrorMessage = (payload = {}, fallbackMessage = "Request failed.") => {
  if (Array.isArray(payload?.errors)) {
    const first = payload.errors.find((item) => item?.msg || item?.message);
    if (first?.msg) return first.msg;
    if (first?.message) return first.message;
  }
  return payload?.message || fallbackMessage;
};

export const pushFieldErrors = (dispatch, errors = []) => {
  if (!Array.isArray(errors)) return;
  errors.forEach((error) => {
    dispatch(setErrorsList(error.msg, error.path));
  });
};
