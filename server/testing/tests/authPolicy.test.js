jest.mock("../../models/Session", () => ({
  findByIdAndUpdate: jest.fn(),
}));
jest.mock("../../shared/middleware/authSupport", () => ({
  sendSessionExpired: (res, statusCode = 401) =>
    res.status(statusCode).json({
      msg: "Session expired. Please login again.",
      tokenStatus: 0,
    }),
}));

const Session = require("../../models/Session");
const {
  enforcePasswordChangedAfterIssuedAt,
  enforceRefreshIdentity,
  enforceRouteRoleAccess,
} = require("../../shared/middleware/authPolicy");

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("authPolicy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows refresh identity when id/uuid are valid", () => {
    const res = createMockRes();
    const user = { _id: { toString: () => "u1" }, uuid: "uuid-1" };
    const decodedRefreshToken = { id: "u1", uuid: "uuid-1" };

    const allowed = enforceRefreshIdentity({ decodedRefreshToken, user, res });

    expect(allowed).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects refresh identity mismatch and returns session-expired payload", () => {
    const res = createMockRes();
    const user = { _id: { toString: () => "u1" }, uuid: "uuid-1" };
    const decodedRefreshToken = { id: "u2", uuid: "uuid-1" };

    const allowed = enforceRefreshIdentity({ decodedRefreshToken, user, res });

    expect(allowed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Session expired. Please login again.",
      tokenStatus: 0,
    });
  });

  it("invalidates session when token issued before password change", async () => {
    const res = createMockRes();
    const session = { _id: "session-1" };
    const user = { passwordChangedAt: new Date("2026-01-02T00:00:00.000Z") };
    const decodedToken = {
      iat: Math.floor(new Date("2026-01-01T00:00:00.000Z").getTime() / 1000),
    };

    const allowed = await enforcePasswordChangedAfterIssuedAt({
      decodedToken,
      user,
      session,
      res,
    });

    expect(allowed).toBe(false);
    expect(Session.findByIdAndUpdate).toHaveBeenCalledWith("session-1", {
      isActive: false,
    });
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("enforces role boundary for admin route", () => {
    const res = createMockRes();
    const allowed = enforceRouteRoleAccess({
      requiredRole: 2,
      isAdmin: false,
      isSubAdmin: false,
      res,
    });

    expect(allowed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Insufficient permissions. Admin access required.",
      tokenStatus: 0,
    });
  });
});
