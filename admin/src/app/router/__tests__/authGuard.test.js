import { describe, expect, it } from "vitest";
import {
  shouldRedirectToLogin,
  shouldShowAuthLoader,
} from "@src/app/router/authGuard";

describe("admin auth guard", () => {
  it("redirects when user is unauthenticated", () => {
    expect(shouldRedirectToLogin({ isAuthenticated: false })).toBe(true);
  });

  it("does not redirect when user is authenticated", () => {
    expect(shouldRedirectToLogin({ isAuthenticated: true })).toBe(false);
  });

  it("shows loader while auth check is pending", () => {
    expect(shouldShowAuthLoader({ loading: true, isAuthChecked: false })).toBe(true);
    expect(shouldShowAuthLoader({ loading: false, isAuthChecked: false })).toBe(true);
  });

  it("does not show loader after auth check completes", () => {
    expect(shouldShowAuthLoader({ loading: false, isAuthChecked: true })).toBe(false);
  });
});
