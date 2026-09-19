import api from "@src/utils/axiosSetup";
import { setAlert } from "@src/app/state/actions/alert";
import { logoutAuth } from "@src/features/auth/authReducer";
import {
  JSON_HEADERS,
  getApiErrorMessage,
  normalizeApiError,
} from "@src/shared/utils/actionHelpers";

export const getLegalPages = () => async (dispatch) => {
  try {
    const res = await api.get("/api/admin/legal-pages", JSON_HEADERS);
    const rows = res.data?.response;
    if (!Array.isArray(rows)) {
      dispatch(setAlert("Failed to load legal pages.", "danger"));
      return { status: false, data: [] };
    }
    return { status: true, data: rows };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false, data: [] };
    }
    const { message } = normalizeApiError(err, "Failed to load legal pages.");
    dispatch(setAlert(message, "danger"));
    return { status: false, data: [] };
  }
};

export const updateLegalPage = (slug, payload) => async (dispatch) => {
  try {
    const res = await api.put(
      `/api/admin/legal-pages/${slug}`,
      payload,
      JSON_HEADERS,
    );
    if (res.data?.status === true) {
      dispatch(setAlert(res.data.message || "Saved successfully.", "success"));
      return { status: true };
    }
    dispatch(
      setAlert(
        getApiErrorMessage(res.data, "Save failed."),
        "danger",
      ),
    );
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAuth());
      return { status: false };
    }
    const { message } = normalizeApiError(err, "Save failed.");
    dispatch(setAlert(message, "danger"));
    return { status: false };
  }
};
