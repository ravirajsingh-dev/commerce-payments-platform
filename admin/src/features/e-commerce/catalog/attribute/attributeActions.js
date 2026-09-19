import api from "@src/utils/axiosSetup";
import { removeAlert, setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import { logoutAuth } from "@src/features/auth/authReducer";
import {
  loadingAttributeList,
  attributeFetched,
  attributeError,
  loadingAttributeSubmit,
  attributeSubmitDone,
} from "./attributeReducer";
import { getApiErrorMessage } from "@src/shared/utils/actionHelpers";

const json = { headers: { "Content-Type": "application/json" } };

const extractListPayload = (responseData) => {
  const bucket = responseData?.[0] || {};
  const metadata = bucket?.metadata?.[0] || {};
  const summary = bucket?.summary?.[0] || {
    active: 0,
    inactive: 0,
  };

  return {
    attributes: bucket?.data || [],
    totalRecord: metadata?.totalRecord || 0,
    summary,
  };
};

export const getAttributeList = (params) => async (dispatch) => {
  try {
    dispatch(loadingAttributeList());
    const res = await api.get("/api/admin/attributes/list", {
      params,
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      const payload = extractListPayload(res.data.response);
      dispatch(attributeFetched(payload));
      return { status: true, data: payload };
    } else {
      dispatch(
        attributeError({
          msg: res.data.message || "Failed to fetch attributes.",
        }),
      );
      dispatch(
        setAlert(getApiErrorMessage(res.data, "Failed to fetch attributes."), "danger"),
      );
      return { status: false, data: null };
    }
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return;

    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false, data: null };
    }

    dispatch(
      attributeError({
        msg: err.response?.statusText || "Error fetching attributes.",
        status: err.response?.status || 500,
      }),
    );
    dispatch(
      setAlert(
        getApiErrorMessage(err.response?.data, "Failed to fetch attributes."),
        "danger",
      ),
    );
    return { status: false, data: null };
  }
};

export const getAttributesOverview =
  (params = {}) =>
  async (dispatch) => {
    dispatch(removeErrors());
    dispatch(removeAlert());
    try {
      const res = await api.get("/api/admin/attributes/overview", {
        params,
        allowDuplicates: true,
      });
      if (res.data.status === true) {
        const bucket = res.data.response?.[0] || {};
        const metadata = bucket.metadata?.[0] || {};
        return {
          status: true,
          data: {
            rows: Array.isArray(bucket.data) ? bucket.data : [],
            totalRecord: Number(metadata.totalRecord || 0),
          },
        };
      }
      dispatch(
        setAlert(
          getApiErrorMessage(res.data, "Failed to fetch attributes overview."),
          "danger",
        ),
      );
      return { status: false, data: [] };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(logoutAuth());
        return { status: false, data: [] };
      }
      dispatch(
        setAlert(
          getApiErrorMessage(err.response?.data, "Failed to fetch attributes overview."),
          "danger",
        ),
      );
      return { status: false, data: [] };
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
      getApiErrorMessage(err.response?.data, fallbackMessage || "Request failed."),
      "danger",
    ),
  );
  dispatch(
    attributeError({
      msg: err.response?.statusText || fallbackMessage,
      status: err.response?.status || 500,
    }),
  );
};

export const createAttribute = (formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingAttributeSubmit());
  try {
    const res = await api.post("/api/admin/attributes/create", formData, json);
    if (res.data.status === true) {
      dispatch(attributeSubmitDone());
      dispatch(setAlert(res.data.message || "Attribute created successfully.", "success"));
      return { status: true };
    }
    dispatch(attributeSubmitDone());
    const errors = res.data.errors || [];
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to create attribute."), "danger"));
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to create attribute.");
    return { status: false };
  }
};

export const getAttributeById = (attributeId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  try {
    const res = await api.get(`/api/admin/attributes/${attributeId}`, {
      allowDuplicates: true,
    });
    if (res.data.status === true) {
      return { status: true, data: res.data.response };
    }
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to fetch attribute."), "danger"));
    return { status: false, data: null };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false, data: null };
    }
    dispatch(
      setAlert(getApiErrorMessage(err.response?.data, "Failed to fetch attribute."), "danger"),
    );
    return { status: false, data: null };
  }
};

export const updateAttribute = (attributeId, formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingAttributeSubmit());
  try {
    const res = await api.put(`/api/admin/attributes/${attributeId}`, formData, json);
    if (res.data.status === true) {
      dispatch(attributeSubmitDone());
      dispatch(setAlert(res.data.message || "Attribute updated successfully.", "success"));
      return { status: true };
    }
    dispatch(attributeSubmitDone());
    const errors = res.data.errors || [];
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to update attribute."), "danger"));
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to update attribute.");
    return { status: false };
  }
};

export const deleteAttribute = (attributeId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingAttributeSubmit());
  try {
    const res = await api.delete(`/api/admin/attributes/${attributeId}`, json);
    if (res.data.status === true) {
      dispatch(attributeSubmitDone());
      dispatch(setAlert(res.data.message || "Attribute deleted successfully.", "success"));
      return { status: true };
    }
    dispatch(attributeSubmitDone());
    dispatch(setAlert(getApiErrorMessage(res.data, "Failed to delete attribute."), "danger"));
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to delete attribute.");
    return { status: false };
  }
};
