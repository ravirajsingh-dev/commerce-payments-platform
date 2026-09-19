import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: null,
  loading: true,
  loadingOnChangePassword: false,
  user: null,
  forgotPasswordEmailVerifyMemberIdLoading: false,
  forgotPasswordEmailSendOtpLoading: false,
  forgotPasswordEmailResendOtpLoading: false,
  forgotPasswordEmailVerifyOtpLoading: false,
  forgotPasswordEmailResetLoading: false,
  forgotPasswordEmailVerifyMemberIdSuccess: false,
  forgotPasswordEmailSendOtpSuccess: false,
  forgotPasswordEmailVerifyOtpSuccess: false,
  forgotPasswordEmailResetSuccess: false,
  error: {},
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    authTokenRefresh(state) {
      state.isAuthenticated = true;
      state.loading = false;
    },

    userLoaded(state, action) {
      state.isAuthenticated = true;
      state.loading = false;
      state.user = action.payload;
    },

    loginSuccess(state, action) {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.loading = false;
      state.loadingOnChangePassword = false;
    },

    authError(state, action) {
      state.error = action.payload;
      state.isAuthenticated = false;
      state.loading = false;
      state.user = null;
    },

    logoutAuth(state) {
      state.isAuthenticated = false;
      state.loading = false;
      state.user = null;
    },

    loginFail(state) {
      state.isAuthenticated = false;
      state.loading = false;
      state.user = null;
    },

    loadingOnLoginSubmit(state) {
      state.loading = true;
    },

    registerError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },

    setLoadingOnChangePassword(state) {
      state.loadingOnChangePassword = true;
    },

    changePasswordSuccess(state) {
      state.loadingOnChangePassword = false;
    },

    changePasswordError(state) {
      state.loadingOnChangePassword = false;
    },

    setLoadingOnForgotPasswordEmailSendOtp(state) {
      state.forgotPasswordEmailSendOtpLoading = true;
      state.forgotPasswordEmailSendOtpSuccess = false;
    },

    forgotPasswordEmailSendOtpSuccess(state) {
      state.forgotPasswordEmailSendOtpLoading = false;
      state.forgotPasswordEmailSendOtpSuccess = true;
    },

    forgotPasswordEmailSendOtpError(state) {
      state.forgotPasswordEmailSendOtpLoading = false;
      state.forgotPasswordEmailSendOtpSuccess = false;
    },

    setLoadingOnForgotPasswordEmailVerifyOtp(state) {
      state.forgotPasswordEmailVerifyOtpLoading = true;
      state.forgotPasswordEmailVerifyOtpSuccess = false;
    },

    forgotPasswordEmailVerifyOtpSuccess(state) {
      state.forgotPasswordEmailVerifyOtpLoading = false;
      state.forgotPasswordEmailVerifyOtpSuccess = true;
    },

    forgotPasswordEmailVerifyOtpError(state) {
      state.forgotPasswordEmailVerifyOtpLoading = false;
      state.forgotPasswordEmailVerifyOtpSuccess = false;
    },

    setLoadingOnForgotPasswordEmailReset(state) {
      state.forgotPasswordEmailResetLoading = true;
      state.forgotPasswordEmailResetSuccess = false;
    },

    forgotPasswordEmailResetSuccess(state) {
      state.forgotPasswordEmailResetLoading = false;
      state.forgotPasswordEmailResetSuccess = true;
    },

    forgotPasswordEmailResetError(state) {
      state.forgotPasswordEmailResetLoading = false;
      state.forgotPasswordEmailResetSuccess = false;
    },

    setLoadingOnForgotPasswordEmailVerifyMemberId(state) {
      state.forgotPasswordEmailVerifyMemberIdLoading = true;
      state.forgotPasswordEmailVerifyMemberIdSuccess = false;
    },

    forgotPasswordEmailVerifyMemberIdSuccess(state) {
      state.forgotPasswordEmailVerifyMemberIdLoading = false;
      state.forgotPasswordEmailVerifyMemberIdSuccess = true;
    },

    forgotPasswordEmailVerifyMemberIdError(state) {
      state.forgotPasswordEmailVerifyMemberIdLoading = false;
      state.forgotPasswordEmailVerifyMemberIdSuccess = false;
    },

    setLoadingOnForgotPasswordEmailResendOtp(state) {
      state.forgotPasswordEmailResendOtpLoading = true;
    },

    forgotPasswordEmailResendOtpSuccess(state) {
      state.forgotPasswordEmailResendOtpLoading = false;
    },

    forgotPasswordEmailResendOtpError(state) {
      state.forgotPasswordEmailResendOtpLoading = false;
    },
  },
});

export const {
  authTokenRefresh,
  userLoaded,
  loginSuccess,
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
