import api from "@src/utils/axiosSetup";
import { removeAlert, setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import { logoutAuth } from "@src/features/auth/authReducer";
import {
  loadingCarriersList,
  carriersFetched,
  carriersError,
  loadingCarriersSubmit,
  carriersSubmitDone,
} from "./carrierReducer";

const json = { headers: { "Content-Type": "application/json" } };

const extractListPayload = (responseData) => {
  const bucket = responseData?.[0] || {};
  const metadata = bucket?.metadata?.[0] || {};
  const summary = bucket?.summary?.[0] || {
    active: 0,
    inactive: 0,
  };

  return {
    carriers: bucket?.data || [],
    totalRecord: metadata?.totalRecord || 0,
    summary,
  };
};

export const getCarriersList = (params) => async (dispatch) => {
  try {
    dispatch(loadingCarriersList());
    const res = await api.get("/api/admin/carriers/list", {
      params,
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      dispatch(carriersFetched(extractListPayload(res.data.response)));
    } else {
      dispatch(
        carriersError({
          msg: res.data.message || "Failed to fetch carriers.",
        }),
      );
      dispatch(
        setAlert(res.data.message || "Failed to fetch carriers.", "danger"),
      );
    }
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return;

    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return;
    }

    dispatch(
      carriersError({
        msg: err.response?.statusText || "Error fetching carriers.",
        status: err.response?.status || 500,
      }),
    );
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to fetch carriers.",
        "danger",
      ),
    );
  }
};

const handleSubmitFailure = (dispatch, err, fallbackMessage) => {
  const errors = err.response?.data?.errors;
  if (errors?.length) {
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
  }
  dispatch(
    setAlert(
      err.response?.data?.message || fallbackMessage || "Request failed.",
      "danger",
    ),
  );
  dispatch(
    carriersError({
      msg: err.response?.statusText || fallbackMessage,
      status: err.response?.status || 500,
    }),
  );
};

export const createCarrier = (formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingCarriersSubmit());
  try {
    const res = await api.post("/api/admin/carriers/create", formData, json);
    if (res.data.status === true) {
      dispatch(carriersSubmitDone());
      dispatch(
        setAlert(
          res.data.message || "Carrier created successfully.",
          "success",
        ),
      );
      return { status: true };
    }
    dispatch(carriersSubmitDone());
    const errors = res.data.errors || [];
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
    dispatch(
      setAlert(res.data.message || "Failed to create carrier.", "danger"),
    );
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to create carrier.");
    return { status: false };
  }
};

export const getCarrierById = (carrierId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  try {
    const res = await api.get(`/api/admin/carriers/${carrierId}`, {
      allowDuplicates: true,
    });
    if (res.data.status === true) {
      return { status: true, data: res.data.response };
    }
    dispatch(
      setAlert(res.data.message || "Failed to fetch carrier.", "danger"),
    );
    return { status: false, data: null };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false, data: null };
    }
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to fetch carrier.",
        "danger",
      ),
    );
    return { status: false, data: null };
  }
};

export const updateCarrier = (carrierId, formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingCarriersSubmit());
  try {
    const res = await api.put(`/api/admin/carriers/${carrierId}`, formData, json);
    if (res.data.status === true) {
      dispatch(carriersSubmitDone());
      dispatch(
        setAlert(
          res.data.message || "Carrier updated successfully.",
          "success",
        ),
      );
      return { status: true };
    }
    dispatch(carriersSubmitDone());
    const errors = res.data.errors || [];
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
    dispatch(
      setAlert(res.data.message || "Failed to update carrier.", "danger"),
    );
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to update carrier.");
    return { status: false };
  }
};

export const deleteCarrier = (carrierId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingCarriersSubmit());
  try {
    const res = await api.delete(`/api/admin/carriers/${carrierId}`, json);
    if (res.data.status === true) {
      dispatch(carriersSubmitDone());
      dispatch(
        setAlert(
          res.data.message || "Carrier deleted successfully.",
          "success",
        ),
      );
      return { status: true };
    }
    dispatch(carriersSubmitDone());
    dispatch(
      setAlert(res.data.message || "Failed to delete carrier.", "danger"),
    );
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to delete carrier.");
    return { status: false };
  }
};
