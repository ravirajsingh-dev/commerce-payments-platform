import adminAuthApi from "@src/utils/adminAuthApi";
import { setAlert, removeAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import {
  setLoadingOnChangePassword,
  changePasswordSuccess,
  changePasswordError,
} from "@src/features/auth/authReducer";
import { loadUser } from "@src/features/auth/sessionActions";

export const changePassword = (formData, _navigate) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnChangePassword());
    dispatch(removeAlert());

    const payload = {
      currentPassword: formData.oldPassword,
      newPassword: formData.password,
      confirmPassword: formData.confirmPassword,
    };

    const res = await adminAuthApi.changePassword(payload);

    if (res.data.status === true) {
      dispatch(changePasswordSuccess(res.data.response));
    } else {
      dispatch(changePasswordError());
      const errors = res.data.errors;
      if (errors?.length > 0) {
        dispatch(
          setAlert(res.data.message || "Something went wrong", "danger"),
        );
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
  } catch (err) {
    const errors = err.response?.data?.errors;
    if (errors?.length > 0) {
      dispatch(setAlert(err.response.data.message, "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    dispatch(changePasswordError());
  }
};

export const setTxnPassword = (formData, navigate) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnChangePassword());
    dispatch(removeAlert());
    const res = await adminAuthApi.setTxnPassword(formData);

    if (res.data.status === true) {
      dispatch(loadUser());
      dispatch(changePasswordSuccess(res.data.response));
      dispatch(setAlert(res.data.message, "success"));
      navigate("/admin/dashboard");
    } else {
      dispatch(changePasswordError());
      const errors = res.data.errors;
      if (errors?.length > 0) {
        dispatch(
          setAlert(res.data.message || "Something went wrong", "danger"),
        );
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
  } catch (err) {
    const errors = err.response?.data?.errors;
    if (errors?.length > 0) {
      dispatch(setAlert(err.response.data.message, "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    dispatch(changePasswordError());
  }
};

export const changeTxnPassword = (formData, navigate) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnChangePassword());
    dispatch(removeAlert());

    const res = await adminAuthApi.changeTxnPassword(formData);

    if (res.data.status === true) {
      dispatch(changePasswordSuccess(res.data.response));
      dispatch(setAlert(res.data.message, "success"));
      navigate("/admin/dashboard");
    } else {
      dispatch(changePasswordError());
      const errors = res.data.errors;
      if (errors?.length > 0) {
        dispatch(
          setAlert(res.data.message || "Something went wrong", "danger"),
        );
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
  } catch (err) {
    const errors = err.response?.data?.errors;
    if (errors?.length > 0) {
      dispatch(setAlert(err.response.data.message, "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    dispatch(changePasswordError());
  }
};
