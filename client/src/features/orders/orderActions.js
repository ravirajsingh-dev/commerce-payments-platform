import api from "@src/utils/axiosSetup";
import {
  API_REQUEST_ALLOW_DUP,
  readJsonApiResponse,
} from "@src/shared/utils/apiResponseHelpers";

const ordersRequestConfig = API_REQUEST_ALLOW_DUP;

const readOrdersResponse = (res, emptyFallback) =>
  readJsonApiResponse(res, "Orders request failed.", emptyFallback);

export const fetchOrdersList =
  ({ page = 1, limit = 20 } = {}) =>
  async () => {
    const res = await api.get("/api/orders", {
      ...ordersRequestConfig,
      params: { page, limit },
    });
    return readOrdersResponse(res);
  };

export const fetchOrderByOrderNo = (orderNo) => async () => {
  const encoded = encodeURIComponent(String(orderNo || "").trim());
  const res = await api.get(`/api/orders/${encoded}`, ordersRequestConfig);
  const data = readOrdersResponse(res);
  return data.order;
};

export const downloadOrderInvoice = (orderNo) => async () => {
  const encoded = encodeURIComponent(String(orderNo || "").trim());
  const res = await api.get(`/api/orders/${encoded}/invoice`, {
    ...ordersRequestConfig,
    responseType: "blob",
  });

  const contentType = String(res.headers?.["content-type"] || "");
  if (contentType.includes("application/json")) {
    const text = await res.data.text();
    let payload = {};
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {};
    }
    const message = payload.message || "Unable to download invoice.";
    const err = new Error(message);
    err.errors = payload.errors || [];
    err.status = res.status;
    throw err;
  }

  const safeName = String(orderNo || "invoice")
    .trim()
    .replace(/[^A-Za-z0-9-]/g, "");

  return {
    blob: res.data,
    fileName: `${safeName || "invoice"}.pdf`,
  };
};

export const requestOrderCancellation =
  (orderNo, { reason, note } = {}) =>
  async () => {
    const encoded = encodeURIComponent(String(orderNo || "").trim());
    const res = await api.post(
      `/api/orders/${encoded}/cancel-request`,
      { reason, note: note || "" },
      ordersRequestConfig,
    );
    const data = readOrdersResponse(res);
    return data.order;
  };

export const requestOrderClaim =
  (orderNo, { type, reasonCode, note, evidence, affectedLines } = {}) =>
  async () => {
    const encoded = encodeURIComponent(String(orderNo || "").trim());
    const res = await api.post(
      `/api/orders/${encoded}/claim-request`,
      {
        type,
        reasonCode,
        note: note || "",
        evidence: { images: evidence?.images || [] },
        affectedLines: Array.isArray(affectedLines) ? affectedLines : [],
      },
      ordersRequestConfig,
    );
    readOrdersResponse(res);
    const detailRes = await api.get(`/api/orders/${encoded}`, ordersRequestConfig);
    const detailData = readOrdersResponse(detailRes);
    return detailData.order;
  };

export const submitOrderClaimReturnShipment =
  (orderNo, { evidence, customerLogistics } = {}) =>
  async () => {
    const encoded = encodeURIComponent(String(orderNo || "").trim());
    const res = await api.post(
      `/api/orders/${encoded}/claim-return-shipment`,
      {
        evidence: { courierReceipt: evidence?.courierReceipt || [] },
        customerLogistics: customerLogistics || {},
      },
      ordersRequestConfig,
    );
    const data = readOrdersResponse(res);
    if (data.order) {
      return data.order;
    }
    const detailRes = await api.get(`/api/orders/${encoded}`, ordersRequestConfig);
    const detailData = readOrdersResponse(detailRes);
    return detailData.order;
  };
