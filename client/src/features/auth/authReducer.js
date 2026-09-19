import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: null,
  loading: true,
  loadingRegister: false,
  loadingOnChangePassword: false,
  user: null,
  forgotPasswordEmailVerifyMemberIdLoading: false,
  forgotPasswordEmailSendOtpLoading: false,
  forgotPasswordEmailResendOtpLoading: false,
  forgotPasswordEmailVerifyOtpLoading: false,
  forgotPasswordEmailResetLoading: false,
  error: {},
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    authTokenRefresh(state) {
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
      };
    },

    userLoaded(state, action) {
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: action.payload,
      };
    },

    registerSuccess(state, action) {
      return {
        ...state,
        user: action.payload,
        loadingRegister: false,
      };
    },

    loginSuccess(state, action) {
      const { user } = action.payload;
      return {
        ...state,
        user,
        isAuthenticated: true,
        loading: false,
        loadingOnChangePassword: false,
      };
    },

    registerFail(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingRegister: false,
      };
    },

    authError(state, action) {
      return {
        ...state,
        error: action.payload,
        isAuthenticated: false,
        loading: false,
        user: null,
      };
    },

    logoutAuth(state) {
      return {
        ...state,
        isAuthenticated: false,
        loading: false,
        user: null,
      };
    },

    loginFail(state) {
      return {
        ...state,
        isAuthenticated: false,
        loading: false,
        user: null,
      };
    },

    loadingOnLoginSubmit(state) {
      return {
        ...state,
        loading: true,
      };
    },
    loadingOnRegisterSubmit(state) {
      return {
        ...state,
        loadingRegister: true,
      };
    },
    registerError(state, action) {
      return {
        ...state,
        error: action.payload,
        loading: false,
        loadingRegister: false,
      };
    },

    setLoadingOnChangePassword(state) {
      return {
        ...state,
        loadingOnChangePassword: true,
      };
    },

    changePasswordSuccess(state) {
      return {
        ...state,
        loadingOnChangePassword: false,
      };
    },
    changePasswordError(state) {
      return {
        ...state,
        loadingOnChangePassword: false,
      };
    },

    setLoadingOnForgotPasswordEmailSendOtp(state) {
      return {
        ...state,
        forgotPasswordEmailSendOtpLoading: true,
      };
    },

    forgotPasswordEmailSendOtpSuccess(state) {
      return {
        ...state,
        forgotPasswordEmailSendOtpLoading: false,
      };
    },

    forgotPasswordEmailSendOtpError(state) {
      return {
        ...state,
        forgotPasswordEmailSendOtpLoading: false,
      };
    },

    setLoadingOnForgotPasswordEmailVerifyOtp(state) {
      return {
        ...state,
        forgotPasswordEmailVerifyOtpLoading: true,
      };
    },

    forgotPasswordEmailVerifyOtpSuccess(state) {
      return {
        ...state,
        forgotPasswordEmailVerifyOtpLoading: false,
      };
    },

    forgotPasswordEmailVerifyOtpError(state) {
      return {
        ...state,
        forgotPasswordEmailVerifyOtpLoading: false,
      };
    },

    setLoadingOnForgotPasswordEmailReset(state) {
      return {
        ...state,
        forgotPasswordEmailResetLoading: true,
      };
    },

    forgotPasswordEmailResetSuccess(state) {
      return {
        ...state,
        forgotPasswordEmailResetLoading: false,
      };
    },

    forgotPasswordEmailResetError(state) {
      return {
        ...state,
        forgotPasswordEmailResetLoading: false,
      };
    },

    setLoadingOnForgotPasswordEmailVerifyMemberId(state) {
      return {
        ...state,
        forgotPasswordEmailVerifyMemberIdLoading: true,
      };
    },

    forgotPasswordEmailVerifyMemberIdSuccess(state) {
      return {
        ...state,
        forgotPasswordEmailVerifyMemberIdLoading: false,
      };
    },

    forgotPasswordEmailVerifyMemberIdError(state) {
      return {
        ...state,
        forgotPasswordEmailVerifyMemberIdLoading: false,
      };
    },

    setLoadingOnForgotPasswordEmailResendOtp(state) {
      return {
        ...state,
        forgotPasswordEmailResendOtpLoading: true,
      };
    },

    forgotPasswordEmailResendOtpSuccess(state) {
      return {
        ...state,
        forgotPasswordEmailResendOtpLoading: false,
      };
    },

    forgotPasswordEmailResendOtpError(state) {
      return {
        ...state,
        forgotPasswordEmailResendOtpLoading: false,
      };
    },
  },
});

export const {
  authTokenRefresh,
  userLoaded,
  registerSuccess,
  loginSuccess,
  loadingOnRegisterSubmit,
  registerFail,
  authError,
  logoutAuth,
  loginFail,
  loadingOnLoginSubmit,
  registerError,
  setLoadingOnChangePassword,
  changePasswordSuccess,
  changePasswordError,
  setLoadingOnForgotPasswordEmailSendOtp,
  forgotPasswordEmailSendOtpSuccess,
  forgotPasswordEmailSendOtpError,
  setLoadingOnForgotPasswordEmailVerifyOtp,
  forgotPasswordEmailVerifyOtpSuccess,
  forgotPasswordEmailVerifyOtpError,
  setLoadingOnForgotPasswordEmailReset,
  forgotPasswordEmailResetSuccess,
  forgotPasswordEmailResetError,
  setLoadingOnForgotPasswordEmailVerifyMemberId,
  forgotPasswordEmailVerifyMemberIdSuccess,
  forgotPasswordEmailVerifyMemberIdError,
  setLoadingOnForgotPasswordEmailResendOtp,
  forgotPasswordEmailResendOtpSuccess,
  forgotPasswordEmailResendOtpError,
} = authSlice.actions;

export default authSlice.reducer;
