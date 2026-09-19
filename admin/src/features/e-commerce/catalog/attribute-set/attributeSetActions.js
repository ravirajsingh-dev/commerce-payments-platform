import api from "@src/utils/axiosSetup";
import { removeAlert, setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import { logoutAuth } from "@src/features/auth/authReducer";
import {
  loadingAttributeSetList,
  attributeSetFetched,
  attributeSetError,
  loadingAttributeSetSubmit,
  attributeSetSubmitDone,
} from "./attributeSetReducer";
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
    attributeSets: bucket?.data || [],
    totalRecord: metadata?.totalRecord || 0,
    summary,
  };
};

export const getAttributeSetList = (params) => async (dispatch) => {
  try {
    dispatch(loadingAttributeSetList());
    const res = await api.get("/api/admin/attribute-sets/list", {
      params,
      allowDuplicates: true,
    });

    if (res.data.status === true) {
      const payload = extractListPayload(res.data.response);
      dispatch(attributeSetFetched(payload));
      return { status: true, data: payload };
    } else {
      dispatch(
        attributeSetError({
          msg: res.data.message || "Failed to fetch attribute sets.",
        }),
      );
      dispatch(
        setAlert(res.data.message || "Failed to fetch attribute sets.", "danger"),
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
      attributeSetError({
        msg: err.response?.statusText || "Error fetching attribute sets.",
        status: err.response?.status || 500,
      }),
    );
    dispatch(
      setAlert(
        getApiErrorMessage(err.response?.data, "Failed to fetch attribute sets."),
        "danger",
      ),
    );
    return { status: false, data: null };
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
    attributeSetError({
      msg: err.response?.statusText || fallbackMessage,
      status: err.response?.status || 500,
    }),
  );
};

export const createAttributeSet = (formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingAttributeSetSubmit());
  try {
    const res = await api.post("/api/admin/attribute-sets/create", formData, json);
    if (res.data.status === true) {
      dispatch(attributeSetSubmitDone());
      dispatch(
        setAlert(
          res.data.message || "Attribute set created successfully.",
          "success",
        ),
      );
      return { status: true };
    }
    dispatch(attributeSetSubmitDone());
    const errors = res.data.errors || [];
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
    dispatch(
      setAlert(
        getApiErrorMessage(res.data, "Failed to create attribute set."),
        "danger",
      ),
    );
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to create attribute set.");
    return { status: false };
  }
};

export const getAttributeSetById = (attributeSetId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  try {
    const res = await api.get(`/api/admin/attribute-sets/${attributeSetId}`, {
      allowDuplicates: true,
    });
    if (res.data.status === true) {
      return { status: true, data: res.data.response };
    }
    dispatch(
      setAlert(getApiErrorMessage(res.data, "Failed to fetch attribute set."), "danger"),
    );
    return { status: false, data: null };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false, data: null };
    }
    dispatch(
      setAlert(
        getApiErrorMessage(err.response?.data, "Failed to fetch attribute set."),
        "danger",
      ),
    );
    return { status: false, data: null };
  }
};

export const updateAttributeSet = (attributeSetId, formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingAttributeSetSubmit());
  try {
    const res = await api.put(
      `/api/admin/attribute-sets/${attributeSetId}`,
      formData,
      json,
    );
    if (res.data.status === true) {
      dispatch(attributeSetSubmitDone());
      dispatch(
        setAlert(
          res.data.message || "Attribute set updated successfully.",
          "success",
        ),
      );
      return { status: true };
    }
    dispatch(attributeSetSubmitDone());
    const errors = res.data.errors || [];
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
    dispatch(
      setAlert(
        getApiErrorMessage(res.data, "Failed to update attribute set."),
        "danger",
      ),
    );
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to update attribute set.");
    return { status: false };
  }
};

export const deleteAttributeSet = (attributeSetId) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  dispatch(loadingAttributeSetSubmit());
  try {
    const res = await api.delete(`/api/admin/attribute-sets/${attributeSetId}`, json);
    if (res.data.status === true) {
      dispatch(attributeSetSubmitDone());
      dispatch(
        setAlert(
          res.data.message || "Attribute set deleted successfully.",
          "success",
        ),
      );
      return { status: true };
    }
    dispatch(attributeSetSubmitDone());
    dispatch(
      setAlert(
        getApiErrorMessage(res.data, "Failed to delete attribute set."),
        "danger",
      ),
    );
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    handleSubmitFailure(dispatch, err, "Failed to delete attribute set.");
    return { status: false };
  }
};
