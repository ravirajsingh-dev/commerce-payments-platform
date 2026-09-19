import api from "@src/utils/axiosSetup";
import { setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import { logoutAuth } from "@src/features/auth/authReducer";
import { getApiErrorMessage } from "@src/shared/utils/actionHelpers";
import {
  loadingOrderList,
  ordersFetched,
  ordersError,
  loadingOrderDetail,
  orderDetailFetched,
  orderDetailError,
  orderDetailClear,
  loadingOrderSubmit,
  orderSubmitDone,
} from "./orderReducer";

const handleFailure = (dispatch, err, fallbackMessage) => {
  if (err.response?.data?.tokenStatus === 0) {
    dispatch(logoutAuth());
    return;
  }
  const errors = err.response?.data?.errors || [];
  errors.forEach((error) => {
    dispatch(setErrorsList(error.msg || error.message, error.path || ""));
  });
  dispatch(setAlert(err.response?.data?.message || fallbackMessage, "danger"));
};

export const getOrderList = (params) => async (dispatch) => {
  try {
    dispatch(loadingOrderList());
    const res = await api.get("/api/admin/orders/list", {
      params,
      allowDuplicates: true,
    });

    if (res.data?.status) {
      const payload = res.data.response || {};
      const data = {
        orders: payload.orders || [],
        totalRecord: payload.pagination?.total || 0,
        summary: payload.summary || {},
        pendingCancelRequestCount: payload.pendingCancelRequestCount ?? 0,
        pendingClaimCount: payload.pendingClaimCount ?? 0,
      };
      dispatch(ordersFetched(data));
      return { status: true, data };
    }

    dispatch(ordersError({ msg: res.data?.message }));
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to fetch orders."), "danger"));
    return { status: false };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return;
    dispatch(ordersError({ msg: err.message }));
    handleFailure(dispatch, err, "Failed to fetch orders.");
    return { status: false };
  }
};

export const getOrderByOrderNo = (orderNo) => async (dispatch) => {
  try {
    dispatch(loadingOrderDetail());
    const encoded = encodeURIComponent(String(orderNo || "").trim());
    const res = await api.get(`/api/admin/orders/${encoded}`, {
      allowDuplicates: true,
    });

    if (res.data?.status) {
      const order = res.data.response?.order;
      dispatch(orderDetailFetched(order));
      return { status: true, data: order };
    }

    dispatch(orderDetailError());
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to fetch order."), "danger"));
    return { status: false };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return;
    dispatch(orderDetailError());
    handleFailure(dispatch, err, "Failed to fetch order.");
    return { status: false };
  }
};

export const cancelOrder = (orderNo, payload) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOrderSubmit());
  try {
    const encoded = encodeURIComponent(String(orderNo || "").trim());
    const res = await api.post(`/api/admin/orders/${encoded}/cancel`, payload);

    if (res.data?.status) {
      const order = res.data.response?.order;
      dispatch(orderSubmitDone(order));
      dispatch(orderDetailFetched(order));
      dispatch(
        setAlert(res.data.message || "Order cancelled.", "success"),
      );
      return { status: true, data: order };
    }

    dispatch(orderSubmitDone());
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to cancel order."), "danger"));
    return { status: false };
  } catch (err) {
    dispatch(orderSubmitDone());
    handleFailure(dispatch, err, "Failed to cancel order.");
    return { status: false };
  }
};

export const patchOrderAddressSnapshot = (orderNo, payload) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOrderSubmit());
  try {
    const encoded = encodeURIComponent(String(orderNo || "").trim());
    const res = await api.patch(
      `/api/admin/orders/${encoded}/address-snapshot`,
      payload,
    );

    if (res.data?.status) {
      const order = res.data.response?.order;
      dispatch(orderSubmitDone(order));
      dispatch(orderDetailFetched(order));
      dispatch(
        setAlert(res.data.message || "Shipping address updated.", "success"),
      );
      return { status: true, data: order };
    }

    dispatch(orderSubmitDone());
    dispatch(
      setAlert(
        getApiErrorMessage(res.data, "Failed to update shipping address."),
        "danger",
      ),
    );
    return { status: false };
  } catch (err) {
    dispatch(orderSubmitDone());
    handleFailure(dispatch, err, "Failed to update shipping address.");
    return { status: false };
  }
};

export const getOrderClaim = (orderNo) => async (dispatch) => {
  try {
    const encoded = encodeURIComponent(String(orderNo || "").trim());
    const res = await api.get(`/api/admin/orders/${encoded}/claim`, {
      allowDuplicates: true,
    });

    if (res.data?.status) {
      const payload = res.data.response || {};
      return {
        status: true,
        data: {
          claim: payload.claim || null,
          orderItems: payload.orderItems || [],
        },
      };
    }

    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to fetch claim."), "danger"));
    return { status: false };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return { status: false };
    handleFailure(dispatch, err, "Failed to fetch claim.");
    return { status: false };
  }
};

export const getAdminClaimsList = (params = {}) => async (dispatch) => {
  try {
    const res = await api.get("/api/admin/orders/claims/list", {
      params,
      allowDuplicates: true,
    });
    if (res.data?.status) {
      const payload = res.data.response || {};
      return {
        status: true,
        data: payload.claims || [],
        pagination: payload.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
    }
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to fetch claims."), "danger"));
    return { status: false, data: [], pagination: null };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return { status: false, data: [] };
    handleFailure(dispatch, err, "Failed to fetch claims.");
    return { status: false, data: [], pagination: null };
  }
};

const submitClaimAction = async (dispatch, request, successMessage, fallbackMessage) => {
  dispatch(removeErrors());
  dispatch(loadingOrderSubmit());
  try {
    const res = await request();
    if (res.data?.status) {
      dispatch(orderSubmitDone());
      dispatch(setAlert(res.data.message || successMessage, "success"));
      return { status: true, data: res.data.response?.claim || null };
    }
    dispatch(orderSubmitDone());
    dispatch(setAlert(getApiErrorMessage(res.data, fallbackMessage), "danger"));
    return { status: false };
  } catch (err) {
    dispatch(orderSubmitDone());
    handleFailure(dispatch, err, fallbackMessage);
    return { status: false };
  }
};

export const approveOrderClaim = (orderNo, payload) => async (dispatch) => {
  const encoded = encodeURIComponent(String(orderNo || "").trim());
  return submitClaimAction(
    dispatch,
    () => api.post(`/api/admin/orders/${encoded}/claim/approve`, payload),
    "Claim approved.",
    "Failed to approve claim.",
  );
};

export const rejectOrderClaim = (orderNo, payload) => async (dispatch) => {
  const encoded = encodeURIComponent(String(orderNo || "").trim());
  return submitClaimAction(
    dispatch,
    () => api.post(`/api/admin/orders/${encoded}/claim/reject`, payload),
    "Claim rejected.",
    "Failed to reject claim.",
  );
};

export const updateOrderClaim = (orderNo, payload) => async (dispatch) => {
  const encoded = encodeURIComponent(String(orderNo || "").trim());
  return submitClaimAction(
    dispatch,
    () => api.patch(`/api/admin/orders/${encoded}/claim`, payload),
    "Claim updated.",
    "Failed to update claim.",
  );
};

export const completeOrderClaim = (orderNo, payload) => async (dispatch) => {
  const encoded = encodeURIComponent(String(orderNo || "").trim());
  return submitClaimAction(
    dispatch,
    () => api.post(`/api/admin/orders/${encoded}/claim/complete`, payload),
    "Claim completed.",
    "Failed to complete claim.",
  );
};

export const createAdminOrderClaimRequest = (orderNo, payload) => async (dispatch) => {
  const encoded = encodeURIComponent(String(orderNo || "").trim());
  return submitClaimAction(
    dispatch,
    () => api.post(`/api/admin/orders/${encoded}/claim/request`, payload),
    "Claim request created.",
    "Failed to create claim request.",
  );
};

export { orderDetailClear };
