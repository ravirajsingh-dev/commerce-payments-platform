// axios with token
import api from "@src/utils/axiosSetup";
import { sanitizeGenericError } from "@src/utils/sanitizeError";

// Custom imports
import { setAlert, removeAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import {
  saveUserCredentials,
  removeUserCredentials,
} from "@src/utils/credentialsHelper";

// Reducers
import { removeErrors } from "@src/app/state/reducers/errors";
import {
  userLoaded,
  registerSuccess,
  loginSuccess,
  registerFail,
  authError,
  logoutAuth,
  loginFail,
  loadingOnLoginSubmit,
  registerError,
  setLoadingOnChangePassword,
  changePasswordSuccess,
  changePasswordError,
  setLoadingOnForgotPasswordEmailVerifyMemberId,
  forgotPasswordEmailVerifyMemberIdSuccess,
  forgotPasswordEmailVerifyMemberIdError,
  setLoadingOnForgotPasswordEmailSendOtp,
  forgotPasswordEmailSendOtpSuccess,
  forgotPasswordEmailSendOtpError,
  setLoadingOnForgotPasswordEmailResendOtp,
  forgotPasswordEmailResendOtpSuccess,
  forgotPasswordEmailResendOtpError,
  setLoadingOnForgotPasswordEmailVerifyOtp,
  forgotPasswordEmailVerifyOtpSuccess,
  forgotPasswordEmailVerifyOtpError,
  setLoadingOnForgotPasswordEmailReset,
  forgotPasswordEmailResetSuccess,
  forgotPasswordEmailResetError,
  loadingOnRegisterSubmit,
} from "@src/features/auth/authReducer";
import {
  JSON_HEADERS_ALLOW_DUP,
  normalizeApiError,
  pushFieldErrors,
  runAsyncAction,
} from "@src/shared/utils/actionHelpers";
import {
  clearCartState,
  fetchCart,
} from "@src/features/cart/cartActions";
import { clearWishlistState, fetchWishlist } from "@src/features/wishlist/wishlistActions";

const mapApiErrorsToStore = (dispatch, errors = []) => {
  pushFieldErrors(dispatch, errors);
};

export const login = (formData, navigate, options = {}) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnLoginSubmit());
  dispatch(removeAlert());
  const returnTo =
    typeof options.returnTo === "string" && options.returnTo.startsWith("/")
      ? options.returnTo
      : null;
  return runAsyncAction({
    execute: async () => {
      const res = await api.post(`/api/auth`, formData, JSON_HEADERS_ALLOW_DUP);

      if (res.data.status === true) {
        const { user } = res.data.response;
        dispatch(loginSuccess({ user }));
        dispatch(fetchCart());
        dispatch(fetchWishlist());
        navigate(returnTo || "/collections");
        dispatch(setAlert("Login successfully", "success"));

        if (formData.rememberPassword) {
          saveUserCredentials(formData.phone);
        } else {
          removeUserCredentials();
        }
      } else {
        if (res.data.errors) {
          dispatch(setAlert(res.data.message, "danger"));
          mapApiErrorsToStore(dispatch, res.data.errors);
        }
        dispatch(
          loginFail({
            msg: res.response?.data?.message || res.response?.statusText,
            status: res.response?.status,
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
        dispatch(setAlert(normalized.message || err.response.statusText, "danger"));
        return err.response.data;
      }
      return { status: false, message: normalized.message };
    },
  });
};

export const register = (formData, _navigate) => async (dispatch) => {
  return runAsyncAction({
    execute: async () => {
      dispatch(removeAlert());
      dispatch(removeErrors());
      dispatch(loadingOnRegisterSubmit());

      const res = await api.post(
        `/api/auth/users/register`,
        formData,
        JSON_HEADERS_ALLOW_DUP,
      );

      if (res.data.status === true) {
        dispatch(registerSuccess(res.data.response?.user));
        dispatch(setAlert("Registration successful", "success"));
        return res.data;
      }

      dispatch(registerFail({ msg: res.data.message }));
      dispatch(setAlert(res.data.message || "Something went wrong", "danger"));
      mapApiErrorsToStore(dispatch, res.data.errors);
      return res.data ? res?.data?.response?.user : { status: false };
    },
    onError: (errors) => {
      if (!errors.response) return { status: false };
      const normalized = normalizeApiError(errors, errors.response.statusText);
      const firstError = normalized.errors[0]?.msg;
      const errorMessage = firstError || normalized.message;

      dispatch(
        registerFail({
          msg: errorMessage,
          status: errors.response.status,
        }),
      );
      dispatch(setAlert(errorMessage, "danger"));
      mapApiErrorsToStore(dispatch, normalized.errors);
      return errors.response.data;
    },
  });
};

const loadUser = (_navigate) => async (dispatch) => {
  try {
    const res = await api.get(`/api/auth/load-user`);

    if (res.data.status === true) {
      dispatch(userLoaded(res.data.response));
      dispatch(fetchCart());
      dispatch(fetchWishlist());
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(setAlert(res.data.message, "danger"));
      }
    }
  } catch (err) {
    const error = err?.response?.data;
    // Always ensure auth state is resolved so UI doesn't stay stuck on loading.
    // If backend explicitly marks token/session as expired, or any other error occurs,
    // treat user as logged out and let routing send them to /login.
    if (error && error.msg) {
      dispatch(setAlert(error.msg, "danger"));
    }
    dispatch(logoutAuth());
  }
};

const logoutAuthActions = () => async (dispatch) => {
  localStorage.setItem("auth.logout.event", `${Date.now()}-${Math.random()}`);
  dispatch(clearCartState());
  dispatch(clearWishlistState());
  dispatch(logoutAuth());
};

export const initializeAuth = (navigate) => async (dispatch) => {
  dispatch(loadUser(navigate));
};

//Logout from current device
export const logout = () => async (dispatch) => {
  const config = { headers: { "Content-Type": "application/json" } };
  try {
    dispatch(removeAlert());
    dispatch(removeErrors());

    // Cookies will be sent automatically via withCredentials
    const res = await api.put(`/api/auth/logout`, {}, config);

    if (res.data.status === true) {
      dispatch(logoutAuthActions());
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      // Always logout even if API returns error status
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
        // Ensure logout state is set even on error
        dispatch(logoutAuthActions());
      }
    } else {
      // Network error or no response - still logout locally
      dispatch(logoutAuthActions());
    }
  }
};

// Change password
export const changePassword = (formData, _navigate) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnChangePassword());
    dispatch(removeAlert());
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const res = await api.post(`/api/auth/change-password`, formData, config);

    if (res.data.status === true) {
      dispatch(changePasswordSuccess(res.data.response));
      return res.data;
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
      return res.data;
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
    return err.response?.data || { status: false };
  }
};

export const updateProfile = (formData, userId) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      allowDuplicates: true,
    };

    const res = await api.put(`/api/users/${userId}`, formData, config);

    if (res.data.status === true) {
      dispatch(userLoaded(res.data.response));
      dispatch(setAlert(res.data.message || "Profile updated successfully.", "success"));
      return res.data;
    }

    dispatch(setAlert(res.data.message || "Unable to update profile.", "danger"));
    mapApiErrorsToStore(dispatch, res.data.errors);
    return res.data;
  } catch (err) {
    const message =
      err.response?.data?.message ||
      sanitizeGenericError(err.message || "Unable to update profile.");
    dispatch(setAlert(message, "danger"));
    mapApiErrorsToStore(dispatch, err.response?.data?.errors);
    return err.response?.data || { status: false, message };
  }
};

export const verifyForgotPasswordEmailMemberId =
  (phone) => async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(setLoadingOnForgotPasswordEmailVerifyMemberId());
      dispatch(removeAlert());

      const config = {
        headers: {
          "Content-Type": "application/json",
        },
        allowDuplicates: true,
      };

      const res = await api.post(
        `/api/auth/forgot-password-email/verify-phone`,
        { phone },
        config,
      );

      if (res.data.status === true) {
        dispatch(forgotPasswordEmailVerifyMemberIdSuccess(res.data.response));
        return res.data.response;
      } else {
        dispatch(forgotPasswordEmailVerifyMemberIdError());
        const errors = res.data.errors;
        if (errors && errors.length > 0) {
          const userMessage =
            errors[0].msg || res.data.message || "Invalid phone number";
          dispatch(setAlert(userMessage, "danger"));
          errors.forEach((error) => {
            dispatch(setErrorsList(error.msg, error.path));
          });
        }
        throw new Error(
          errors && errors.length > 0
            ? errors[0].msg
            : res.data.message || "Invalid phone number",
        );
      }
    } catch (err) {
      dispatch(forgotPasswordEmailVerifyMemberIdError());
      const errors = err.response?.data?.errors;
      if (errors && errors.length > 0) {
        const userMessage =
          errors[0].msg ||
          err.response?.data?.message ||
          "Invalid phone number";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
        throw new Error(userMessage);
      } else {
        const userMessage =
          err.response?.data?.message || err.message || "Invalid phone number";
        dispatch(setAlert(userMessage, "danger"));
        throw new Error(userMessage);
      }
    }
  };

export const sendForgotPasswordEmailOtp =
  (phone, email) => async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(setLoadingOnForgotPasswordEmailSendOtp());
      dispatch(removeAlert());

      const config = {
        headers: {
          "Content-Type": "application/json",
        },
        allowDuplicates: true,
      };

      const res = await api.post(
        `/api/auth/forgot-password-email/send-otp`,
        { phone, email },
        config,
      );

      if (res.data.status === true) {
        dispatch(forgotPasswordEmailSendOtpSuccess(res.data.response));
        return res.data.response;
      } else {
        dispatch(forgotPasswordEmailSendOtpError());
        const errors = res.data.errors;
        if (errors && errors.length > 0) {
          const userMessage =
            errors[0].msg || res.data.message || "Failed to send OTP";
          dispatch(setAlert(userMessage, "danger"));
          errors.forEach((error) => {
            dispatch(setErrorsList(error.msg, error.path));
          });
        }
        throw new Error(
          errors && errors.length > 0
            ? errors[0].msg
            : res.data.message || "Failed to send OTP",
        );
      }
    } catch (err) {
      dispatch(forgotPasswordEmailSendOtpError());
      const errors = err.response?.data?.errors;
      if (errors && errors.length > 0) {
        const userMessage =
          errors[0].msg || err.response?.data?.message || "Failed to send OTP";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
        throw new Error(userMessage);
      } else {
        const userMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to send OTP. Please try again.";
        dispatch(setAlert(userMessage, "danger"));
        throw new Error(userMessage);
      }
    }
  };

export const resendForgotPasswordEmailOtp = (phone) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnForgotPasswordEmailResendOtp());
    dispatch(removeAlert());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      allowDuplicates: true,
    };

    const res = await api.post(
      `/api/auth/forgot-password-email/resend-otp`,
      { phone },
      config,
    );

    if (res.data.status === true) {
      dispatch(forgotPasswordEmailResendOtpSuccess(res.data.response));
      return res.data.response;
    } else {
      dispatch(forgotPasswordEmailResendOtpError());
      const errors = res.data.errors;
      if (errors && errors.length > 0) {
        const userMessage =
          errors[0].msg ||
          res.data.message ||
          "Failed to resend OTP. Please try again.";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      throw new Error(
        errors && errors.length > 0
          ? errors[0].msg
          : res.data.message || "Failed to resend OTP. Please try again.",
      );
    }
  } catch (err) {
    dispatch(forgotPasswordEmailResendOtpError());
    const errors = err.response?.data?.errors;
    if (errors && errors.length > 0) {
      const userMessage =
        errors[0].msg ||
        err.response?.data?.message ||
        "Failed to resend OTP. Please try again.";
      dispatch(setAlert(userMessage, "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
      throw new Error(userMessage);
    } else {
      const userMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to resend OTP. Please try again.";
      dispatch(setAlert(userMessage, "danger"));
      throw new Error(userMessage);
    }
  }
};

export const verifyForgotPasswordEmailOtp =
  (phone, otp) => async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(setLoadingOnForgotPasswordEmailVerifyOtp());
      dispatch(removeAlert());

      const config = {
        headers: {
          "Content-Type": "application/json",
        },
        allowDuplicates: true,
      };

      const res = await api.post(
        `/api/auth/forgot-password-email/verify-otp`,
        { phone, otp },
        config,
      );

      if (res.data.status === true) {
        dispatch(forgotPasswordEmailVerifyOtpSuccess(res.data.response));
        return res.data.response;
      } else {
        dispatch(forgotPasswordEmailVerifyOtpError());
        const errors = res.data.errors;
        if (errors && errors.length > 0) {
          const userMessage =
            errors[0].msg || res.data.message || "Invalid or expired OTP";
          dispatch(setAlert(userMessage, "danger"));
          errors.forEach((error) => {
            dispatch(setErrorsList(error.msg, error.path));
          });
        }
        throw new Error(
          errors && errors.length > 0
            ? errors[0].msg
            : res.data.message || "Invalid or expired OTP",
        );
      }
    } catch (err) {
      dispatch(forgotPasswordEmailVerifyOtpError());
      const errors = err.response?.data?.errors;
      if (errors && errors.length > 0) {
        const userMessage =
          errors[0].msg ||
          err.response?.data?.message ||
          "Invalid or expired OTP";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
        throw new Error(userMessage);
      } else {
        const userMessage =
          err.response?.data?.message ||
          err.message ||
          "Invalid or expired OTP";
        dispatch(setAlert(userMessage, "danger"));
        throw new Error(userMessage);
      }
    }
  };

export const resetPasswordWithEmailOtp =
  (phone, otp, password, confirmPassword) => async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(setLoadingOnForgotPasswordEmailReset());
      dispatch(removeAlert());

      const config = {
        headers: {
          "Content-Type": "application/json",
        },
        allowDuplicates: true,
      };

      const res = await api.post(
        `/api/auth/forgot-password-email/reset`,
        { phone, otp, password, confirmPassword },
        config,
      );

      if (res.data.status === true) {
        dispatch(forgotPasswordEmailResetSuccess(res.data.response));
        return res.data.response;
      } else {
        dispatch(forgotPasswordEmailResetError());
        const errors = res.data.errors;
        if (errors && errors.length > 0) {
          const userMessage =
            errors[0].msg ||
            res.data.message ||
            "Password reset failed. Please try again.";
          dispatch(setAlert(userMessage, "danger"));
          errors.forEach((error) => {
            dispatch(setErrorsList(error.msg, error.path));
          });
        }
        throw new Error(
          errors && errors.length > 0
            ? errors[0].msg
            : res.data.message || "Password reset failed. Please try again.",
        );
      }
    } catch (err) {
      dispatch(forgotPasswordEmailResetError());
      const errors = err.response?.data?.errors;
      if (errors && errors.length > 0) {
        const userMessage =
          errors[0].msg ||
          err.response?.data?.message ||
          "Password reset failed. Please try again.";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
        throw new Error(userMessage);
      } else {
        const userMessage =
          err.response?.data?.message ||
          err.message ||
          "Password reset failed. Please try again.";
        dispatch(setAlert(userMessage, "danger"));
        throw new Error(userMessage);
      }
    }
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
