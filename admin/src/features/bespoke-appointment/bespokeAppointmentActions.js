import api from "@src/utils/axiosSetup";
import { setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import { removeAlertMsg } from "@src/app/state/reducers/alert";
import { logoutAuth } from "@src/features/auth/authReducer";
import {
  loadingSettings,
  settingsFetched,
  settingsError,
  settingsSubmitting,
  settingsSaved,
  optionsLoading,
  optionsFetched,
  optionsSubmitting,
  optionsSubmitDone,
  submissionsLoading,
  submissionsFetched,
  submissionsSubmitting,
  submissionsSubmitDone,
  submissionDetailLoading,
  submissionDetailFetched,
  submissionDetailClear,
} from "./bespokeAppointmentReducer";

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

export const getBespokeSettings = () => async (dispatch) => {
  dispatch(loadingSettings());
  try {
    const res = await api.get("/api/admin/bespoke-appointment/settings");
    if (res.data?.status) {
      dispatch(settingsFetched(res.data.response));
    } else {
      dispatch(settingsError());
    }
  } catch (err) {
    dispatch(settingsError());
    handleFailure(dispatch, err, "Failed to fetch settings.");
  }
};

export const updateBespokeSettings = (payload) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlertMsg());
  dispatch(settingsSubmitting());
  try {
    const res = await api.put("/api/admin/bespoke-appointment/settings", payload);
    if (res.data?.status) {
      dispatch(settingsSaved(res.data.response));
      dispatch(setAlert(res.data.message || "Settings saved.", "success"));
      return { status: true };
    }
    dispatch(settingsError());
    dispatch(setAlert(res.data?.message || "Failed to save settings.", "danger"));
    return { status: false };
  } catch (err) {
    dispatch(settingsError());
    handleFailure(dispatch, err, "Failed to save settings.");
    return { status: false };
  }
};

export const getBespokeOptions = () => async (dispatch) => {
  dispatch(optionsLoading());
  try {
    const res = await api.get("/api/admin/bespoke-appointment/options/list");
    if (res.data?.status) {
      dispatch(optionsFetched(res.data.response || []));
    }
  } catch (err) {
    handleFailure(dispatch, err, "Failed to fetch service options.");
  }
};

export const createBespokeOption = (payload) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlertMsg());
  dispatch(optionsSubmitting());
  try {
    const res = await api.post("/api/admin/bespoke-appointment/options/create", payload);
    dispatch(optionsSubmitDone());
    if (res.data?.status) {
      dispatch(setAlert(res.data.message || "Option created.", "success"));
      return { status: true };
    }
    dispatch(setAlert(res.data?.message || "Failed to create option.", "danger"));
    return { status: false };
  } catch (err) {
    dispatch(optionsSubmitDone());
    handleFailure(dispatch, err, "Failed to create option.");
    return { status: false };
  }
};

export const updateBespokeOption = (id, payload) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlertMsg());
  dispatch(optionsSubmitting());
  try {
    const res = await api.put(`/api/admin/bespoke-appointment/options/${id}`, payload);
    dispatch(optionsSubmitDone());
    if (res.data?.status) {
      dispatch(setAlert(res.data.message || "Option updated.", "success"));
      return { status: true };
    }
    dispatch(setAlert(res.data?.message || "Failed to update option.", "danger"));
    return { status: false };
  } catch (err) {
    dispatch(optionsSubmitDone());
    handleFailure(dispatch, err, "Failed to update option.");
    return { status: false };
  }
};

export const deleteBespokeOption = (id) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlertMsg());
  dispatch(optionsSubmitting());
  try {
    const res = await api.delete(`/api/admin/bespoke-appointment/options/${id}`);
    dispatch(optionsSubmitDone());
    if (res.data?.status) {
      dispatch(setAlert(res.data.message || "Option deleted.", "success"));
      return { status: true };
    }
    dispatch(setAlert(res.data?.message || "Failed to delete option.", "danger"));
    return { status: false };
  } catch (err) {
    dispatch(optionsSubmitDone());
    handleFailure(dispatch, err, "Failed to delete option.");
    return { status: false };
  }
};

export const getBespokeSubmissions = () => async (dispatch) => {
  dispatch(submissionsLoading());
  try {
    const res = await api.get("/api/admin/bespoke-appointment/submissions/list");
    if (res.data?.status) {
      dispatch(submissionsFetched(res.data.response || []));
    }
  } catch (err) {
    handleFailure(dispatch, err, "Failed to fetch appointments.");
  }
};

export const getBespokeSubmissionById = (id) => async (dispatch) => {
  dispatch(submissionDetailLoading());
  try {
    const res = await api.get(`/api/admin/bespoke-appointment/submissions/${id}`);
    if (res.data?.status) {
      dispatch(submissionDetailFetched(res.data.response));
      return { status: true, data: res.data.response };
    }
    return { status: false };
  } catch (err) {
    handleFailure(dispatch, err, "Failed to fetch appointment details.");
    return { status: false };
  }
};

export { submissionDetailClear } from "./bespokeAppointmentReducer";

export const deleteBespokeSubmission = (id) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlertMsg());
  dispatch(submissionsSubmitting());
  try {
    const res = await api.delete(`/api/admin/bespoke-appointment/submissions/${id}`);
    dispatch(submissionsSubmitDone());
    dispatch(submissionDetailClear());
    if (res.data?.status) {
      dispatch(setAlert(res.data.message || "Appointment deleted.", "success"));
      return { status: true };
    }
    dispatch(setAlert(res.data?.message || "Failed to delete appointment.", "danger"));
    return { status: false };
  } catch (err) {
    dispatch(submissionsSubmitDone());
    handleFailure(dispatch, err, "Failed to delete appointment.");
    return { status: false };
  }
};
