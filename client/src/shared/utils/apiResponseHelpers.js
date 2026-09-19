/** Shared axios response parsing for client feature actions. */
export const API_REQUEST_ALLOW_DUP = { allowDuplicates: true };

export const readJsonApiResponse = (
  res,
  fallbackMessage = "Request failed.",
  emptyFallback = {},
) => {
  if (!res?.data?.status) {
    const message = res?.data?.message || fallbackMessage;
    const err = new Error(message);
    err.errors = res?.data?.errors || [];
    err.status = res?.status;
    throw err;
  }
  return res.data.response != null ? res.data.response : emptyFallback;
}
