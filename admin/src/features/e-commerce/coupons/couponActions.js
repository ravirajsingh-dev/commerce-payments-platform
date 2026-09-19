import api from "@src/utils/axiosSetup";
import { removeAlert, setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import { logoutAuth } from "@src/features/auth/authReducer";
import { getApiErrorMessage } from "@src/shared/utils/actionHelpers";
import {
  loadingCouponList,
  couponsFetched,
  couponsError,
  loadingCouponDetail,
  couponDetailFetched,
  couponDetailClear,
  loadingCouponSubmit,
  couponSubmitDone,
} from "./couponReducer";

const handleFailure = (dispatch, err, fallbackMessage) => {
  if (err.response?.data?.tokenStatus === 0) {
    dispatch(logoutAuth());
    return;
  }
  const errors = err.response?.data?.errors || [];
  errors.forEach((error) => {
    dispatch(setErrorsList(error.msg || error.message, error.path || ""));
  });
  dispatch(setAlert(getApiErrorMessage(err.response?.data, fallbackMessage), "danger"));
};

export const getCouponList = (params) => async (dispatch) => {
  try {
    dispatch(loadingCouponList());
    const res = await api.get("/api/admin/coupons/list", {
      params,
      allowDuplicates: true,
    });

    if (res.data?.status) {
      const payload = res.data.response || {};
      const data = {
        coupons: payload.coupons || [],
        totalRecord: payload.pagination?.total || 0,
        summary: payload.summary || { active: 0, inactive: 0 },
      };
      dispatch(couponsFetched(data));
      return { status: true, data };
    }

    dispatch(couponsError({ msg: res.data?.message }));
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to fetch coupons."), "danger"));
    return { status: false };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return;
    dispatch(couponsError({ msg: err.message }));
    handleFailure(dispatch, err, "Failed to fetch coupons.");
    return { status: false };
  }
};

export const getCouponById = (couponId) => async (dispatch) => {
  try {
    dispatch(loadingCouponDetail());
    const res = await api.get(`/api/admin/coupons/${couponId}`, {
      allowDuplicates: true,
    });

    if (res.data?.status) {
      const coupon = res.data.response?.coupon;
      dispatch(couponDetailFetched(coupon));
      return { status: true, data: coupon };
    }

    dispatch(couponDetailClear());
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to fetch coupon."), "danger"));
    return { status: false };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return;
    dispatch(couponDetailClear());
    handleFailure(dispatch, err, "Failed to fetch coupon.");
    return { status: false };
  }
};

export const createCoupon = (payload) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingCouponSubmit());

  try {
    const res = await api.post("/api/admin/coupons", payload);
    dispatch(couponSubmitDone());

    if (res.data?.status) {
      dispatch(setAlert(res.data.message || "Coupon created.", "success"));
      return { status: true, data: res.data.response?.coupon };
    }

    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to create coupon."), "danger"));
    return { status: false };
  } catch (err) {
    dispatch(couponSubmitDone());
    handleFailure(dispatch, err, "Failed to create coupon.");
    return { status: false };
  }
};

export const updateCoupon = (couponId, payload) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingCouponSubmit());

  try {
    const res = await api.put(`/api/admin/coupons/${couponId}`, payload);
    dispatch(couponSubmitDone());

    if (res.data?.status) {
      dispatch(setAlert(res.data.message || "Coupon updated.", "success"));
      return { status: true, data: res.data.response?.coupon };
    }

    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to update coupon."), "danger"));
    return { status: false };
  } catch (err) {
    dispatch(couponSubmitDone());
    handleFailure(dispatch, err, "Failed to update coupon.");
    return { status: false };
  }
};

export const deleteCoupon = (couponId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingCouponSubmit());

  try {
    const res = await api.delete(`/api/admin/coupons/${couponId}`);
    dispatch(couponSubmitDone());

    if (res.data?.status) {
      dispatch(setAlert(res.data.message || "Coupon deleted.", "success"));
      return { status: true };
    }

    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to delete coupon."), "danger"));
    return { status: false };
  } catch (err) {
    dispatch(couponSubmitDone());
    handleFailure(dispatch, err, "Failed to delete coupon.");
    return { status: false };
  }
};

export const setCouponStatus = (couponId, status) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingCouponSubmit());

  try {
    const res = await api.patch(`/api/admin/coupons/${couponId}/status`, { status });
    dispatch(couponSubmitDone());

    if (res.data?.status) {
      const label = Number(status) === 1 ? "enabled" : "disabled";
      dispatch(setAlert(res.data.message || `Coupon ${label}.`, "success"));
      return { status: true, data: res.data.response?.coupon };
    }

    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to update coupon status."), "danger"));
    return { status: false };
  } catch (err) {
    dispatch(couponSubmitDone());
    handleFailure(dispatch, err, "Failed to update coupon status.");
    return { status: false };
  }
};

export const clearCouponDetail = () => (dispatch) => {
  dispatch(couponDetailClear());
};
