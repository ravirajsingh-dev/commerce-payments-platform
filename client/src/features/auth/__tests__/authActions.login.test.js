import { describe, expect, it, vi, beforeEach } from "vitest";
import { login } from "@src/features/auth/authActions";
import api from "@src/utils/axiosSetup";
import {
  removeUserCredentials,
  saveUserCredentials,
} from "@src/utils/credentialsHelper";

vi.mock("@src/utils/axiosSetup", () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock("@src/utils/credentialsHelper", () => ({
  saveUserCredentials: vi.fn(),
  removeUserCredentials: vi.fn(),
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

describe("client login action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches success flow and navigates on valid login", async () => {
    api.post.mockResolvedValue({
      data: { status: true, response: { user: { id: "u1" } } },
    });
    const navigate = vi.fn();
    const { dispatch, dispatched } = createDispatch();

    const result = await login({ phone: "9999999999", rememberPassword: true }, navigate)(
      dispatch,
    );

    expect(result.status).toBe(true);
    expect(navigate).toHaveBeenCalledWith("/collections");
    expect(saveUserCredentials).toHaveBeenCalledWith("9999999999");
    expect(dispatched.some((a) => a?.type === "auth/loginSuccess")).toBe(true);
  });

  it("dispatches fail flow on api error response", async () => {
    api.post.mockRejectedValue({
      response: {
        status: 401,
        statusText: "Unauthorized",
        data: { message: "Invalid credentials", errors: [] },
      },
    });
    const navigate = vi.fn();
    const { dispatch, dispatched } = createDispatch();

    const result = await login({ phone: "9999999999", rememberPassword: false }, navigate)(
      dispatch,
    );

    expect(result.message).toBe("Invalid credentials");
    expect(navigate).not.toHaveBeenCalled();
    expect(removeUserCredentials).not.toHaveBeenCalled();
    expect(dispatched.some((a) => a?.type === "auth/loginFail")).toBe(true);
  });
});
