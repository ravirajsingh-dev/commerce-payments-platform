import { beforeEach, describe, expect, it, vi } from "vitest";
import { login } from "@src/features/auth/sessionActions";
import adminAuthApi from "@src/utils/adminAuthApi";
import {
  removeAdminCredentials,
  saveAdminCredentials,
} from "@src/utils/credentialsHelper";

vi.mock("@src/utils/adminAuthApi", () => ({
  default: {
    login: vi.fn(),
  },
}));

vi.mock("@src/utils/credentialsHelper", () => ({
  saveAdminCredentials: vi.fn(),
  removeAdminCredentials: vi.fn(),
}));

const createDispatch = () => {
  const dispatched = [];
  const dispatch = (action) => {
    dispatched.push(action);
    if (typeof action === "function") {
      return action(dispatch);
    }
    return action;
  };
  return { dispatch, dispatched };
};

describe("admin login action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches success flow and navigates on valid login", async () => {
    adminAuthApi.login.mockResolvedValue({
      data: { status: true, response: { user: { id: "admin-1" } } },
    });
    const navigate = vi.fn();
    const { dispatch, dispatched } = createDispatch();

    const result = await login(
      { admin_id: "admin-001", password: "secret", rememberPassword: true },
      navigate,
    )(dispatch);

    expect(result.status).toBe(true);
    expect(navigate).toHaveBeenCalledWith("/admin/dashboard");
    expect(saveAdminCredentials).toHaveBeenCalledWith("admin-001");
    expect(dispatched.some((a) => a?.type === "auth/loginSuccess")).toBe(true);
  });

  it("dispatches fail flow on api error response", async () => {
    adminAuthApi.login.mockRejectedValue({
      response: {
        status: 401,
        statusText: "Unauthorized",
        data: { message: "Invalid admin credentials", errors: [] },
      },
    });
    const navigate = vi.fn();
    const { dispatch, dispatched } = createDispatch();

    const result = await login(
      { admin_id: "admin-001", password: "bad", rememberPassword: false },
      navigate,
    )(dispatch);

    expect(result.message).toBe("Invalid admin credentials");
    expect(navigate).not.toHaveBeenCalled();
    expect(removeAdminCredentials).not.toHaveBeenCalled();
    expect(dispatched.some((a) => a?.type === "auth/loginFail")).toBe(true);
  });
});
