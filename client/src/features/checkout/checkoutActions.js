import api from "@src/utils/axiosSetup";
import {
  API_REQUEST_ALLOW_DUP,
  readJsonApiResponse,
} from "@src/shared/utils/apiResponseHelpers";

const checkoutRequestConfig = API_REQUEST_ALLOW_DUP;

const readCheckoutResponse = (res, emptyFallback) =>
  readJsonApiResponse(res, "Checkout request failed.", emptyFallback);

export const previewCheckout = () => async () => {
  const res = await api.post("/api/checkout/preview", {}, checkoutRequestConfig);
  const data = readCheckoutResponse(res);
  return data.preview;
};

export const placeOrder = (payload) => async () => {
  const res = await api.post("/api/checkout/place", payload, checkoutRequestConfig);
  const data = readCheckoutResponse(res);
  return data.order;
};
