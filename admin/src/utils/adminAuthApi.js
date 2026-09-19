import api from "@src/utils/axiosSetup";

/**
 * Centralized admin auth HTTP layer. Server routes are mounted at /api/auth/admin.
 * Keeps path strings in one place for the admin SPA.
 */
const BASE = "/api/auth/admin";

const json = { headers: { "Content-Type": "application/json" } };
const jsonAllowDup = {
  headers: { "Content-Type": "application/json" },
  allowDuplicates: true,
};

const adminAuthApi = {
  login: (body) => api.post(BASE, body, jsonAllowDup),

  loadSession: () => api.get(`${BASE}/load-admin`, json),

  logout: () => api.put(`${BASE}/logout`, {}, json),

  changePassword: (body) => api.post(`${BASE}/change-password`, body, json),

  setTxnPassword: (body) => api.post(`${BASE}/set-txn-password`, body, json),

  changeTxnPassword: (body) => api.post(`${BASE}/change-txn-password`, body, json),

  forgotPasswordVerifyAdminId: (adminId) =>
    api.post(
      `${BASE}/forgot-password/verify-admin-id`,
      { adminId },
      jsonAllowDup,
    ),

  forgotPasswordSendOtp: (adminId, email) =>
    api.post(
      `${BASE}/forgot-password/send-otp`,
      { adminId, email },
      jsonAllowDup,
    ),

  forgotPasswordResendOtp: (adminId) =>
    api.post(
      `${BASE}/forgot-password/resend-otp`,
      { adminId },
      jsonAllowDup,
    ),

  forgotPasswordVerifyOtp: (adminId, otp) =>
    api.post(
      `${BASE}/forgot-password/verify-otp`,
      { adminId, otp },
      jsonAllowDup,
    ),

  forgotPasswordReset: (body) =>
    api.post(`${BASE}/forgot-password/reset`, body, jsonAllowDup),
};

export default adminAuthApi;
