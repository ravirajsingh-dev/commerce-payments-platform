jest.mock("../../models/Session", () => ({
  findOne: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

jest.mock("../../shared/middleware/authSupport", () => ({
  getRoleAwareCookies: jest.fn(),
  sendSessionExpired: jest.fn(),
  resolvePrincipalFromDecodedToken: jest.fn(),
  expectedRoleFromModel: jest.fn(),
}));

jest.mock("../../shared/middleware/authTokenService", () => ({
  verifyTokenSafely: jest.fn(),
  resolveSessionUserId: jest.fn(),
  resolveLookupToken: jest.fn(),
  resolveTokenRole: jest.fn(),
}));

jest.mock("../../shared/middleware/authPolicy", () => ({
  enforceSessionClientBinding: jest.fn(),
  enforceRoleConsistency: jest.fn(),
  enforceUserAccountStatus: jest.fn(),
  enforcePasswordChangedAfterIssuedAt: jest.fn(),
  enforceRouteRoleAccess: jest.fn(),
  enforceRefreshIdentity: jest.fn(),
}));

jest.mock("../../config/config", () => ({
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
}));

const Session = require("../../models/Session");
const jwt = require("jsonwebtoken");
const {
  getRoleAwareCookies,
  sendSessionExpired,
  resolvePrincipalFromDecodedToken,
  expectedRoleFromModel,
} = require("../../shared/middleware/authSupport");
const {
  verifyTokenSafely,
  resolveSessionUserId,
  resolveLookupToken,
  resolveTokenRole,
} = require("../../shared/middleware/authTokenService");
const {
  enforceSessionClientBinding,
  enforceRoleConsistency,
  enforceUserAccountStatus,
  enforcePasswordChangedAfterIssuedAt,
  enforceRouteRoleAccess,
  enforceRefreshIdentity,
} = require("../../shared/middleware/authPolicy");
const { UserAuth } = require("../../shared/middleware/auth");

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const mockValidFlow = () => {
  verifyTokenSafely.mockReturnValue({
    decoded: { id: "u1", uuid: "uuid-1", role: 1 },
    error: null,
  });
  resolveSessionUserId.mockReturnValue({ userId: "u1" });
  Session.findOne.mockResolvedValue({
    _id: "s1",
    isActive: true,
    refreshToken: "refresh-token",
  });
  enforceSessionClientBinding.mockResolvedValue(true);
  resolveLookupToken.mockReturnValue({
    token: { id: "u1", role: 1, uuid: "uuid-1" },
    isRefresh: false,
  });
  resolvePrincipalFromDecodedToken.mockResolvedValue({
    user: { _id: "u1", uuid: "uuid-1", status: 1 },
    isAdmin: false,
    isSubAdmin: false,
  });
  expectedRoleFromModel.mockReturnValue(1);
  resolveTokenRole.mockReturnValue(1);
  enforceRoleConsistency.mockResolvedValue(true);
  enforceUserAccountStatus.mockReturnValue(true);
  enforcePasswordChangedAfterIssuedAt.mockResolvedValue(true);
  enforceRouteRoleAccess.mockReturnValue(true);
};

describe("auth middleware integration paths", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendSessionExpired.mockImplementation((res, statusCode = 401) =>
      res.status(statusCode).json({
        msg: "Session expired. Please login again.",
        tokenStatus: 0,
      }),
    );
  });

  it("returns session expired when auth cookies are missing", async () => {
    getRoleAwareCookies.mockReturnValue({ token: null, refreshToken: null, sessionID: null });
    const req = { cookies: {} };
    const res = createRes();
    const next = jest.fn();

    await UserAuth(req, res, next);

    expect(sendSessionExpired).toHaveBeenCalledWith(res, 401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns session expired when session is inactive", async () => {
    getRoleAwareCookies.mockReturnValue({
      token: "access-token",
      refreshToken: "refresh-token",
      sessionID: "session-1",
    });
    verifyTokenSafely.mockReturnValue({ decoded: { id: "u1" }, error: null });
    resolveSessionUserId.mockReturnValue({ userId: "u1" });
    Session.findOne.mockResolvedValue({ isActive: false });
    const req = { cookies: {} };
    const res = createRes();
    const next = jest.fn();

    await UserAuth(req, res, next);

    expect(sendSessionExpired).toHaveBeenCalledWith(res, 401);
    expect(next).not.toHaveBeenCalled();
  });

  it("completes valid auth flow and calls next", async () => {
    getRoleAwareCookies.mockReturnValue({
      token: "access-token",
      refreshToken: "refresh-token",
      sessionID: "session-1",
    });
    mockValidFlow();
    const req = { cookies: {} };
    const res = createRes();
    const next = jest.fn();

    await UserAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userObj).toEqual({ _id: "u1", uuid: "uuid-1", status: 1 });
    expect(req.isAdmin).toBe(false);
    expect(req.isSubAdmin).toBe(false);
  });

  it("rejects refresh flow and returns 401 without rotating in middleware", async () => {
    getRoleAwareCookies.mockReturnValue({
      token: "expired-access-token",
      refreshToken: "refresh-token",
      sessionID: "session-1",
    });
    verifyTokenSafely.mockReturnValue({
      decoded: null,
      error: { name: "TokenExpiredError" },
    });
    resolveSessionUserId.mockReturnValue({ userId: "u1" });
    Session.findOne.mockResolvedValue({
      _id: "s1",
      isActive: true,
      refreshToken: "refresh-token",
    });
    enforceSessionClientBinding.mockResolvedValue(true);
    resolveLookupToken.mockReturnValue({
      token: { id: "u1", role: 1, uuid: "uuid-1" },
      isRefresh: true,
    });
    resolvePrincipalFromDecodedToken.mockResolvedValue({
      user: { _id: "u1", uuid: "uuid-1", status: 1 },
      isAdmin: false,
      isSubAdmin: false,
    });
    expectedRoleFromModel.mockReturnValue(1);
    resolveTokenRole.mockReturnValue(1);
    enforceRoleConsistency.mockResolvedValue(true);
    enforceUserAccountStatus.mockReturnValue(true);
    enforcePasswordChangedAfterIssuedAt.mockResolvedValue(true);
    enforceRefreshIdentity.mockReturnValue(true);
    enforceRouteRoleAccess.mockReturnValue(true);
    jwt.verify.mockReturnValue({ id: "u1", role: 1, uuid: "uuid-1" });
    const req = { cookies: {} };
    const res = createRes();
    const next = jest.fn();

    await UserAuth(req, res, next);

    expect(sendSessionExpired).toHaveBeenCalledWith(res, 401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects request when session client binding check fails (tamper path)", async () => {
    getRoleAwareCookies.mockReturnValue({
      token: "access-token",
      refreshToken: "refresh-token",
      sessionID: "session-1",
    });
    mockValidFlow();
    enforceSessionClientBinding.mockResolvedValue(false);
    const req = { cookies: {} };
    const res = createRes();
    const next = jest.fn();

    await UserAuth(req, res, next);

    expect(enforceSessionClientBinding).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects request when token role and database role mismatch", async () => {
    getRoleAwareCookies.mockReturnValue({
      token: "access-token",
      refreshToken: "refresh-token",
      sessionID: "session-1",
    });
    mockValidFlow();
    enforceRoleConsistency.mockResolvedValue(false);
    const req = { cookies: {} };
    const res = createRes();
    const next = jest.fn();

    await UserAuth(req, res, next);

    expect(enforceRoleConsistency).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("handles parallel request race by rejecting stale second session lookup", async () => {
    getRoleAwareCookies.mockReturnValue({
      token: "access-token",
      refreshToken: "refresh-token",
      sessionID: "session-1",
    });
    verifyTokenSafely.mockReturnValue({
      decoded: { id: "u1", uuid: "uuid-1", role: 1 },
      error: null,
    });
    resolveSessionUserId.mockReturnValue({ userId: "u1" });
    Session.findOne
      .mockResolvedValueOnce({
        _id: "s1",
        isActive: true,
        refreshToken: "refresh-token",
      })
      .mockResolvedValueOnce({
        _id: "s1",
        isActive: false,
        refreshToken: "refresh-token",
      });
    enforceSessionClientBinding.mockResolvedValue(true);
    resolveLookupToken.mockReturnValue({
      token: { id: "u1", role: 1, uuid: "uuid-1" },
      isRefresh: false,
    });
    resolvePrincipalFromDecodedToken.mockResolvedValue({
      user: { _id: "u1", uuid: "uuid-1", status: 1 },
      isAdmin: false,
      isSubAdmin: false,
    });
    expectedRoleFromModel.mockReturnValue(1);
    resolveTokenRole.mockReturnValue(1);
    enforceRoleConsistency.mockResolvedValue(true);
    enforceUserAccountStatus.mockReturnValue(true);
    enforcePasswordChangedAfterIssuedAt.mockResolvedValue(true);
    enforceRouteRoleAccess.mockReturnValue(true);

    const req1 = { cookies: {} };
    const req2 = { cookies: {} };
    const res1 = createRes();
    const res2 = createRes();
    const next1 = jest.fn();
    const next2 = jest.fn();

    await UserAuth(req1, res1, next1);
    await UserAuth(req2, res2, next2);

    expect(next1).toHaveBeenCalledTimes(1);
    expect(sendSessionExpired).toHaveBeenCalledWith(res2, 401);
    expect(next2).not.toHaveBeenCalled();
  });
});
