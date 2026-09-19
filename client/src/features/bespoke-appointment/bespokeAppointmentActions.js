import api from "@src/utils/axiosSetup";
import { setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import { removeAlertMsg } from "@src/app/state/reducers/alert";
import {
  loadingContent,
  contentFetched,
  contentError,
  submitting,
  submitSuccess,
  submitError,
  resetSubmit,
} from "./bespokeAppointmentReducer";

export const getBespokeAppointmentContent = () => async (dispatch) => {
  dispatch(loadingContent());
  try {
    const res = await api.get("/api/common/bespoke-appointment");
    if (res.data?.status) {
      dispatch(contentFetched(res.data.response || null));
    } else {
      dispatch(contentError());
    }
  } catch {
    dispatch(contentError());
  }
};

export const submitBespokeAppointment = (formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlertMsg());
  dispatch(resetSubmit());
  dispatch(submitting());
  try {
    const res = await api.post("/api/common/bespoke-appointment/submit", formData);
    if (res.data?.status) {
      dispatch(submitSuccess());
      dispatch(
        setAlert(
          res.data.message || "Your appointment request has been submitted.",
          "success",
        ),
      );
      return { status: true };
    }
    dispatch(submitError());
    dispatch(setAlert(res.data?.message || "Failed to submit appointment.", "danger"));
    return { status: false };
  } catch (err) {
    dispatch(submitError());
    const errors = err.response?.data?.errors || [];
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg || error.message, error.path || ""));
    });
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to submit appointment.",
        "danger",
      ),
    );
    return { status: false };
  }
};
