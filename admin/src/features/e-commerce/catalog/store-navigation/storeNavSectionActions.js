import api from "@src/utils/axiosSetup";
import { removeAlert, setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import { logoutAuth } from "@src/features/auth/authReducer";
import {
  loadingStoreNavSectionList,
  storeNavSectionFetched,
  storeNavSectionError,
  loadingStoreNavSectionSubmit,
  storeNavSectionSubmitDone,
} from "./storeNavSectionReducer";
import { getApiErrorMessage } from "@src/shared/utils/actionHelpers";

const extractListPayload = (responseData) => {
  const bucket = responseData?.[0] || {};
  const metadata = bucket?.metadata?.[0] || {};
  const summary = bucket?.summary?.[0] || { active: 0, inactive: 0 };
  return {
    sections: bucket?.data || [],
    totalRecord: metadata?.totalRecord || 0,
    summary,
  };
};

export const getStoreNavSectionList = (params) => async (dispatch) => {
  try {
    dispatch(loadingStoreNavSectionList());
    const res = await api.get("/api/admin/store-nav-sections/list", {
      params,
      allowDuplicates: true,
    });
    if (res.data.status === true) {
      const payload = extractListPayload(res.data.response);
      dispatch(storeNavSectionFetched(payload));
      return { status: true, data: payload };
    }
    dispatch(
      storeNavSectionError({
        msg: res.data.message || "Failed to fetch sections.",
      }),
    );
    dispatch(setAlert(res.data.message || "Failed to fetch sections.", "danger"));
    return { status: false, data: null };
  } catch (err) {
    if (err?.message === "Duplicate request in progress") return;
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false, data: null };
    }
    dispatch(
      storeNavSectionError({
        msg: err.response?.statusText || "Error fetching sections.",
        status: err.response?.status || 500,
      }),
    );
    dispatch(
      setAlert(
        getApiErrorMessage(err.response?.data, "Failed to fetch sections."),
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
    setAlert(getApiErrorMessage(err.response?.data, fallbackMessage), "danger"),
  );
  dispatch(
    storeNavSectionError({
      msg: err.response?.statusText || fallbackMessage,
      status: err.response?.status || 500,
    }),
  );
};

export const createStoreNavSection = (formData) => async (dispatch) => {
  try {
    dispatch(loadingStoreNavSectionSubmit());
    dispatch(removeErrors());
    const res = await api.post("/api/admin/store-nav-sections/create", formData);
    if (res.data.status === true) {
      dispatch(storeNavSectionSubmitDone());
      dispatch(removeAlert());
      dispatch(setAlert("Section created successfully.", "success"));
      return { status: true, data: res.data.response };
    }
    dispatch(storeNavSectionSubmitDone());
    dispatch(setAlert(res.data.message || "Create failed.", "danger"));
    return { status: false };
  } catch (err) {
    dispatch(storeNavSectionSubmitDone());
    handleSubmitFailure(dispatch, err, "Failed to create section.");
    return { status: false };
  }
};

export const getStoreNavSectionById = (sectionId) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    const res = await api.get(`/api/admin/store-nav-sections/${sectionId}`, {
      allowDuplicates: true,
    });
    if (res.data.status === true) {
      return { status: true, data: res.data.response };
    }
    dispatch(
      setAlert(res.data.message || "Failed to load section.", "danger"),
    );
    return { status: false, data: null };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false, data: null };
    }
    dispatch(
      setAlert(
        getApiErrorMessage(err.response?.data, "Failed to load section."),
        "danger",
      ),
    );
    return { status: false, data: null };
  }
};

export const updateStoreNavSection = (id, formData) => async (dispatch) => {
  try {
    dispatch(loadingStoreNavSectionSubmit());
    dispatch(removeErrors());
    const res = await api.put(`/api/admin/store-nav-sections/${id}`, formData);
    if (res.data.status === true) {
      dispatch(storeNavSectionSubmitDone());
      dispatch(removeAlert());
      dispatch(setAlert("Section updated successfully.", "success"));
      return { status: true, data: res.data.response };
    }
    dispatch(storeNavSectionSubmitDone());
    dispatch(setAlert(res.data.message || "Update failed.", "danger"));
    return { status: false };
  } catch (err) {
    dispatch(storeNavSectionSubmitDone());
    handleSubmitFailure(dispatch, err, "Failed to update section.");
    return { status: false };
  }
};

export const deleteStoreNavSection = (id) => async (dispatch) => {
  try {
    dispatch(loadingStoreNavSectionSubmit());
    const res = await api.delete(`/api/admin/store-nav-sections/${id}`);
    if (res.data.status === true) {
      dispatch(storeNavSectionSubmitDone());
      dispatch(setAlert("Section deleted successfully.", "success"));
      return { status: true };
    }
    dispatch(storeNavSectionSubmitDone());
    dispatch(setAlert(res.data.message || "Delete failed.", "danger"));
    return { status: false };
  } catch (err) {
    dispatch(storeNavSectionSubmitDone());
    handleSubmitFailure(dispatch, err, "Failed to delete section.");
    return { status: false };
  }
};
