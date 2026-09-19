class StorefrontApiError extends Error {
  constructor(message, { status, responseBody } = {}) {
    super(message);
    this.name = "StorefrontApiError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

export const readStoreApiResponse = (res, emptyFallback = {}) => {
  if (!res?.data?.status) {
    throw new StorefrontApiError(res?.data?.message || "Request failed.", {
      status: res?.status,
      responseBody: res?.data,
    });
  }
  return res.data.response != null ? res.data.response : emptyFallback;
}

export const mapAxiosToStorefrontError = (err, fallbackMessage) => {
  const status = err?.response?.status ?? err?.status;
  const fromBody = err?.response?.data?.message;
  const message =
    fromBody ||
    (status === 404
      ? "We couldn't find this resource."
      : fallbackMessage || "Something went wrong.");
  return { status, message };
}

export const buildCatalogSearchParams = ({ q = "" } = {}) => {
  const params = new URLSearchParams();
  const trimmedQ = String(q || "").trim();
  if (trimmedQ) params.set("q", trimmedQ);
  return params;
};
