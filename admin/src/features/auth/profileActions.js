import { setAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import { registerError } from "@src/features/auth/authReducer";

export const removeAllErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};

export const setErrors = (errors) => async (dispatch) => {
  if (errors) {
    dispatch(registerError());
    dispatch(setAlert("Please correct the following errors", "danger"));
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg, error.path));
    });
  }
};

export const removeRegistrationErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};
