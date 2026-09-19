import { describe, expect, it } from "vitest";
import authReducer, {
  authError,
  loginSuccess,
  logoutAuth,
  setLoadingOnForgotPasswordEmailSendOtp,
} from "@src/features/auth/authReducer";

describe("admin authReducer", () => {
  it("sets auth state on login success", () => {
    const state = authReducer(undefined, loginSuccess({ user: { id: "a1" } }));
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual({ id: "a1" });
    expect(state.loading).toBe(false);
  });

  it("clears auth state on logout", () => {
    const loggedIn = authReducer(undefined, loginSuccess({ user: { id: "a1" } }));
    const state = authReducer(loggedIn, logoutAuth());
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it("starts forgot-password email OTP loading", () => {
    const state = authReducer(undefined, setLoadingOnForgotPasswordEmailSendOtp());
    expect(state.forgotPasswordEmailSendOtpLoading).toBe(true);
    expect(state.forgotPasswordEmailSendOtpSuccess).toBe(false);
  });

  it("resets user and auth flags on auth error", () => {
    const loggedIn = authReducer(undefined, loginSuccess({ user: { id: "a1" } }));
    const state = authReducer(loggedIn, authError({ msg: "expired", status: 401 }));
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.loading).toBe(false);
  });
});
