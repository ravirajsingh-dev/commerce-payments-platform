import adminAuthApi from "@src/utils/adminAuthApi";
import { setAlert, removeAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import {
  saveAdminCredentials,
  removeAdminCredentials,
} from "@src/utils/credentialsHelper";
import { removeErrors } from "@src/app/state/reducers/errors";
import {
  userLoaded,
  loginSuccess,
  authError,
  logoutAuth,
  loginFail,
  loadingOnLoginSubmit,
} from "@src/features/auth/authReducer";
import {
  normalizeApiError,
  pushFieldErrors,
  runAsyncAction,
} from "@src/shared/utils/actionHelpers";

const mapApiErrorsToStore = (dispatch, errors = []) => {
  pushFieldErrors(dispatch, errors);
};

export const login = (formData, navigate) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnLoginSubmit());
  dispatch(removeAlert());
  return runAsyncAction({
    execute: async () => {
      const payload = {
        admin_id: formData.admin_id,
        password: formData.password,
      };

      const res = await adminAuthApi.login(payload);

      if (res.data.status === true) {
        const { user } = res.data.response;
        dispatch(loginSuccess({ user }));
        navigate("/admin/dashboard");
        dispatch(setAlert("Login successfully", "success"));

        if (formData.rememberPassword) {
          saveAdminCredentials(formData.admin_id);
        } else {
          removeAdminCredentials();
        }
      } else {
        if (res.data.errors?.length) {
          dispatch(setAlert(res.data.message, "danger"));
          mapApiErrorsToStore(dispatch, res.data.errors);
        }
        dispatch(
          loginFail({
            msg: res.data.message || "Login failed",
            status: res.status,
          }),
        );
      }
      return res.data ? res.data : { status: false };
    },
    onError: (err) => {
      const normalized = normalizeApiError(err, "Login failed");
      if (normalized.errors.length > 0) {
        dispatch(setAlert(normalized.message, "danger"));
        mapApiErrorsToStore(dispatch, normalized.errors);
      }

      if (err.response) {
        dispatch(
          loginFail({
            msg: normalized.message || err.response.statusText,
            status: err.response.status,
          }),
        );
        dispatch(
          setAlert(normalized.message || err.response.statusText, "danger"),
        );
        return err.response.data;
      }
      return { status: false, message: normalized.message };
    },
  });
};

export const loadUser = (_navigate) => async (dispatch) => {
  return runAsyncAction({
    execute: async () => {
      const res = await adminAuthApi.loadSession();

      if (res.data.status === true) {
        dispatch(userLoaded(res.data.response));
      } else if (res.data.errors) {
        dispatch(setAlert(res.data.message, "danger"));
      }
    },
    onError: (err) => {
      const normalized = normalizeApiError(err, "Session load failed");
      if (normalized.message) {
        dispatch(setAlert(normalized.message, "danger"));
      }
      dispatch(logoutAuth());
    },
  });
};

const logoutAuthActions = () => async (dispatch) => {
  localStorage.setItem("auth.logout.event", `${Date.now()}-${Math.random()}`);
  dispatch(logoutAuth());
};

export const initializeAuth = (navigate) => async (dispatch) => {
  dispatch(loadUser(navigate));
};

export const logout = () => async (dispatch) => {
  try {
    dispatch(removeAlert());
    dispatch(removeErrors());

    const res = await adminAuthApi.logout();

    if (res.data.status === true) {
      dispatch(logoutAuthActions());
    } else {
      if (res.data.errors) {
        dispatch(setAlert(res.data.message, "danger"));
        res.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(logoutAuthActions());
    }
  } catch (err) {
    if (err.response) {
      if (err.response.data && err.response.data.tokenStatus === 0) {
        dispatch(setAlert(err.response.data.msg, "danger"));
        dispatch(logoutAuthActions());
        dispatch(removeErrors());
      } else {
        dispatch(
          authError({
            msg: err.response.statusText,
            status: err.response.status,
          }),
        );
        dispatch(
          setAlert(
            err.response.data.message || err.response.statusText,
            "danger",
          ),
        );
        dispatch(logoutAuthActions());
      }
    } else {
      dispatch(logoutAuthActions());
    }
  }
};
