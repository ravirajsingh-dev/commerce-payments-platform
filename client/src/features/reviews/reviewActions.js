import api from "@src/utils/axiosSetup";
import { API_REQUEST_ALLOW_DUP } from "@src/shared/utils/apiResponseHelpers";

export const fetchVariantReviews =
  (variantId, params = {}) =>
  async () => {
    try {
      const res = await api.get(
        `/api/reviews/variants/${encodeURIComponent(variantId)}`,
        { params, ...API_REQUEST_ALLOW_DUP },
      );
      if (res.data?.status) {
        return { status: true, data: res.data.response || {} };
      }
      return {
        status: false,
        data: null,
        message: res.data?.message || "Unable to load reviews.",
      };
    } catch (err) {
      return {
        status: false,
        data: null,
        message:
          err?.response?.data?.message || "Unable to load reviews.",
        error: err,
      };
    }
  };

export const fetchMyReviewContext = (variantId) => async () => {
  try {
    const res = await api.get(
      `/api/reviews/variants/${encodeURIComponent(variantId)}/me`,
      API_REQUEST_ALLOW_DUP,
    );
    if (res.data?.status) {
      return { status: true, data: res.data.response || {} };
    }
    return {
      status: false,
      data: null,
      message: res.data?.message || "Unable to load review context.",
    };
  } catch (err) {
    return {
      status: false,
      data: null,
      message:
        err?.response?.data?.message || "Unable to load review context.",
      error: err,
    };
  }
};

export const fetchOrderReviewContext = (orderNo) => async () => {
  try {
    const res = await api.get(
      `/api/reviews/orders/${encodeURIComponent(orderNo)}`,
      API_REQUEST_ALLOW_DUP,
    );
    if (res.data?.status) {
      return { status: true, data: res.data.response || {} };
    }
    return {
      status: false,
      data: null,
      message: res.data?.message || "Unable to load reviews for this order.",
    };
  } catch (err) {
    return {
      status: false,
      data: null,
      message:
        err?.response?.data?.message ||
        "Unable to load reviews for this order.",
      error: err,
    };
  }
};

export const submitProductReview = (payload) => async () => {
  try {
    const res = await api.post("/api/reviews", payload);
    if (res.data?.status) {
      return { status: true, data: res.data.response || {} };
    }
    return {
      status: false,
      data: null,
      message: res.data?.message || "Unable to submit review.",
      errors: res.data?.errors || [],
    };
  } catch (err) {
    return {
      status: false,
      data: null,
      message:
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.msg ||
        "Unable to submit review.",
      errors: err?.response?.data?.errors || [],
      error: err,
    };
  }
};
