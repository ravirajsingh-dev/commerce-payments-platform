import api from "@src/utils/axiosSetup";
import { removeAlert, setAlert } from "@src/app/state/actions/alert";
import { removeErrors } from "@src/app/state/reducers/errors";
import { logoutAuth } from "@src/features/auth/authReducer";
import {
  JSON_HEADERS,
  JSON_HEADERS_ALLOW_DUP,
  normalizeApiError,
  pushFieldErrors,
  runAsyncAction,
} from "@src/shared/utils/actionHelpers";

export const getMyProfile = () => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  return runAsyncAction({
    execute: async () => {
      const res = await api.get("/api/admin/profile/me", JSON_HEADERS_ALLOW_DUP);

      if (res.data.status === true) {
        return { status: true, data: res.data.response };
      }

      dispatch(setAlert(res.data.message || "Failed to fetch profile.", "danger"));
      return { status: false, data: null };
    },
    onError: (err) => {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(logoutAuth());
        return { status: false, data: null };
      }
      const normalized = normalizeApiError(err, "Failed to fetch profile.");
      dispatch(setAlert(normalized.message, "danger"));
      return { status: false, data: null };
    },
  });
};

export const updateMyProfile = (formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());
  return runAsyncAction({
    execute: async () => {
      const res = await api.put("/api/admin/profile/me", formData, JSON_HEADERS);

      if (res.data.status === true) {
        dispatch(
          setAlert(res.data.message || "Profile updated successfully.", "success"),
        );
        return { status: true, data: res.data.response };
      }

      pushFieldErrors(dispatch, res.data.errors || []);
      dispatch(setAlert(res.data.message || "Failed to update profile.", "danger"));
      return { status: false, data: null };
    },
    onError: (err) => {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(logoutAuth());
        return { status: false, data: null };
      }

      const normalized = normalizeApiError(err, "Failed to update profile.");
      pushFieldErrors(dispatch, normalized.errors);
      dispatch(setAlert(normalized.message, "danger"));
      return { status: false, data: null };
    },
  });
};
