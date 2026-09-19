import adminAuthApi from "@src/utils/adminAuthApi";
import { setAlert, removeAlert } from "@src/app/state/actions/alert";
import { setErrorsList } from "@src/app/state/actions/errors";
import { removeErrors } from "@src/app/state/reducers/errors";
import {
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
} from "@src/features/auth/authReducer";

export const verifyForgotPasswordEmailMemberId =
  (adminId) => async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(setLoadingOnForgotPasswordEmailVerifyMemberId());
      dispatch(removeAlert());

      const res = await adminAuthApi.forgotPasswordVerifyAdminId(adminId);

      if (res.data.status === true) {
        dispatch(forgotPasswordEmailVerifyMemberIdSuccess(res.data.response));
        return res.data.response;
      }
      dispatch(forgotPasswordEmailVerifyMemberIdError());
      const errors = res.data.errors;
      if (errors?.length > 0) {
        const userMessage =
          errors[0].msg || res.data.message || "Invalid Admin ID";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      throw new Error(
        errors?.length > 0
          ? errors[0].msg
          : res.data.message || "Invalid Admin ID",
      );
    } catch (err) {
      dispatch(forgotPasswordEmailVerifyMemberIdError());
      const errors = err.response?.data?.errors;
      if (errors?.length > 0) {
        const userMessage =
          errors[0].msg || err.response?.data?.message || "Invalid Admin ID";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
        throw new Error(userMessage);
      }
      const userMessage =
        err.response?.data?.message || err.message || "Invalid Admin ID";
      dispatch(setAlert(userMessage, "danger"));
      throw new Error(userMessage);
    }
  };

export const sendForgotPasswordEmailOtp =
  (adminId, email) => async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(setLoadingOnForgotPasswordEmailSendOtp());
      dispatch(removeAlert());

      const res = await adminAuthApi.forgotPasswordSendOtp(adminId, email);

      if (res.data.status === true) {
        dispatch(forgotPasswordEmailSendOtpSuccess(res.data.response));
        return res.data.response;
      }
      dispatch(forgotPasswordEmailSendOtpError());
      const errors = res.data.errors;
      if (errors?.length > 0) {
        const userMessage =
          errors[0].msg || res.data.message || "Failed to send OTP";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      throw new Error(
        errors?.length > 0
          ? errors[0].msg
          : res.data.message || "Failed to send OTP",
      );
    } catch (err) {
      dispatch(forgotPasswordEmailSendOtpError());
      const errors = err.response?.data?.errors;
      if (errors?.length > 0) {
        const userMessage =
          errors[0].msg || err.response?.data?.message || "Failed to send OTP";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
        throw new Error(userMessage);
      }
      const userMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to send OTP. Please try again.";
      dispatch(setAlert(userMessage, "danger"));
      throw new Error(userMessage);
    }
  };

export const resendForgotPasswordEmailOtp = (adminId) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(setLoadingOnForgotPasswordEmailResendOtp());
    dispatch(removeAlert());

    const res = await adminAuthApi.forgotPasswordResendOtp(adminId);

    if (res.data.status === true) {
      dispatch(forgotPasswordEmailResendOtpSuccess(res.data.response));
      return res.data.response;
    }
    dispatch(forgotPasswordEmailResendOtpError());
    const errors = res.data.errors;
    if (errors?.length > 0) {
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
      errors?.length > 0
        ? errors[0].msg
        : res.data.message || "Failed to resend OTP. Please try again.",
    );
  } catch (err) {
    dispatch(forgotPasswordEmailResendOtpError());
    const errors = err.response?.data?.errors;
    if (errors?.length > 0) {
      const userMessage =
        errors[0].msg ||
        err.response?.data?.message ||
        "Failed to resend OTP. Please try again.";
      dispatch(setAlert(userMessage, "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
      throw new Error(userMessage);
    }
    const userMessage =
      err.response?.data?.message ||
      err.message ||
      "Failed to resend OTP. Please try again.";
    dispatch(setAlert(userMessage, "danger"));
    throw new Error(userMessage);
  }
};

export const verifyForgotPasswordEmailOtp =
  (adminId, otp) => async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(setLoadingOnForgotPasswordEmailVerifyOtp());
      dispatch(removeAlert());

      const res = await adminAuthApi.forgotPasswordVerifyOtp(adminId, otp);

      if (res.data.status === true) {
        dispatch(forgotPasswordEmailVerifyOtpSuccess(res.data.response));
        return res.data.response;
      }
      dispatch(forgotPasswordEmailVerifyOtpError());
      const errors = res.data.errors;
      if (errors?.length > 0) {
        const userMessage =
          errors[0].msg || res.data.message || "Invalid or expired OTP";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      throw new Error(
        errors?.length > 0
          ? errors[0].msg
          : res.data.message || "Invalid or expired OTP",
      );
    } catch (err) {
      dispatch(forgotPasswordEmailVerifyOtpError());
      const errors = err.response?.data?.errors;
      if (errors?.length > 0) {
        const userMessage =
          errors[0].msg ||
          err.response?.data?.message ||
          "Invalid or expired OTP";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
        throw new Error(userMessage);
      }
      const userMessage =
        err.response?.data?.message || err.message || "Invalid or expired OTP";
      dispatch(setAlert(userMessage, "danger"));
      throw new Error(userMessage);
    }
  };

export const resetPasswordWithEmailOtp =
  (adminId, otp, password, confirmPassword) => async (dispatch) => {
    try {
      dispatch(removeErrors());
      dispatch(setLoadingOnForgotPasswordEmailReset());
      dispatch(removeAlert());

      const res = await adminAuthApi.forgotPasswordReset({
        adminId,
        otp,
        password,
        confirmPassword,
      });

      if (res.data.status === true) {
        dispatch(forgotPasswordEmailResetSuccess(res.data.response));
        return res.data.response;
      }
      dispatch(forgotPasswordEmailResetError());
      const errors = res.data.errors;
      if (errors?.length > 0) {
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
        errors?.length > 0
          ? errors[0].msg
          : res.data.message || "Password reset failed. Please try again.",
      );
    } catch (err) {
      dispatch(forgotPasswordEmailResetError());
      const errors = err.response?.data?.errors;
      if (errors?.length > 0) {
        const userMessage =
          errors[0].msg ||
          err.response?.data?.message ||
          "Password reset failed. Please try again.";
        dispatch(setAlert(userMessage, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
        throw new Error(userMessage);
      }
      const userMessage =
        err.response?.data?.message ||
        err.message ||
        "Password reset failed. Please try again.";
      dispatch(setAlert(userMessage, "danger"));
      throw new Error(userMessage);
    }
  };
