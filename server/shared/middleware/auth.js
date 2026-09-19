const jwt = require("jsonwebtoken");
const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } = require("../../config/config");
const Session = require("../../models/Session");
const {
  getRoleAwareCookies,
  sendSessionExpired,
  resolvePrincipalFromDecodedToken,
  expectedRoleFromModel,
} = require("./authSupport");
const {
  verifyTokenSafely,
  resolveSessionUserId,
  resolveLookupToken,
  resolveTokenRole,
} = require("./authTokenService");
const {
  enforceSessionClientBinding,
  enforceRoleConsistency,
  enforceUserAccountStatus,
  enforcePasswordChangedAfterIssuedAt,
  enforceRouteRoleAccess,
  enforceRefreshIdentity,
} = require("./authPolicy");

const verifyToken = async (req, res, next, role = null) => {
  // Read tokens from cookies only - no header fallback.
  // Cookie extraction is kept role-aware in shared helper.
  const { token, refreshToken, sessionID } = getRoleAwareCookies(req, role);

  if (!token || !refreshToken) {
    return sendSessionExpired(res, 401);
  }

  if (!sessionID) {
    return sendSessionExpired(res, 401);
  }

  let decoded;
  try {
    const verified = verifyTokenSafely(token, JWT_ACCESS_SECRET);
    if (verified.error && verified.error.name !== "TokenExpiredError") {
      return sendSessionExpired(res, 401);
    }
    decoded = verified.decoded;
    req.user = decoded;
  } catch (_err) {
    return sendSessionExpired(res, 401);
  }

  try {
    const { userId: userIdForSession } = resolveSessionUserId({
      decodedAccessToken: decoded,
      refreshToken,
    });

    const session = await Session.findOne({
      userID: userIdForSession,
      sessionID,
      refreshToken,
    });

    if (!session) {
      return sendSessionExpired(res, 401);
    }

    if (!session.isActive) {
      return sendSessionExpired(res, 401);
    }

    if (!(await enforceSessionClientBinding({ req, session, res }))) {
      return;
    }

    let user;
    let isAdmin = false;
    let isSubAdmin = false;
    const lookup = resolveLookupToken({
      decodedAccessToken: decoded,
      refreshToken,
    });
    const tokenForLookup = lookup.token;
    if (!tokenForLookup) {
      return sendSessionExpired(res, 401);
    }
    const resolved = await resolvePrincipalFromDecodedToken(tokenForLookup);
    user = resolved.user;
    isAdmin = resolved.isAdmin;
    isSubAdmin = resolved.isSubAdmin;

    if (!user) {
      return sendSessionExpired(res, 401);
    }

    // SECURITY: Verify role consistency between token and database
    // Determine expected role from database user model
    const expectedRole = expectedRoleFromModel({ isAdmin, isSubAdmin });

    // Compare decoded token role with database role
    // Check both access token (if decoded) and refresh token role
    const tokenRole = resolveTokenRole({
      decodedAccessToken: decoded,
      refreshToken,
    });
    if (
      !(await enforceRoleConsistency({
        tokenRole,
        expectedRole,
        session,
        res,
      }))
    ) {
      return;
    }

    if (!enforceUserAccountStatus({ user, isAdmin, isSubAdmin, res })) {
      return;
    }

    if (
      !(await enforcePasswordChangedAfterIssuedAt({
        decodedToken: decoded,
        user,
        session,
        res,
      }))
    ) {
      return;
    }

    if (decoded) {
      if (user.uuid !== decoded.uuid) {
        return sendSessionExpired(res, 401);
      }

      if (!enforceRouteRoleAccess({ requiredRole: role, isAdmin, isSubAdmin, res })) {
        return;
      }

      req.userObj = user;
      req.isAdmin = isAdmin;
      req.isSubAdmin = isSubAdmin;
      return next();
    }

    // If token is expired, verify the refresh token
    try {
      const decodedRefreshToken = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

      if (
        !(await enforceRoleConsistency({
          tokenRole: decodedRefreshToken.role,
          expectedRole,
          session,
          res,
        }))
      ) {
        return;
      }

      if (!enforceRefreshIdentity({ decodedRefreshToken, user, res })) {
        return;
      }

      if (!enforceRouteRoleAccess({ requiredRole: role, isAdmin, isSubAdmin, res })) {
        return;
      }

      if (
        !(await enforcePasswordChangedAfterIssuedAt({
          decodedToken: decodedRefreshToken,
          user,
          session,
          res,
        }))
      ) {
        return;
      }

      // Do NOT rotate here. Return 401 so the client calls POST /api/auth/refresh-token.
      // Rotation in middleware causes a race: another in-flight request with old cookies
      // fails session lookup (DB already has new refreshToken) then refresh-token fails
      // with "Invalid token" → sudden logout. Only the refresh-token endpoint should rotate.
      return sendSessionExpired(res, 401);
    } catch (refreshError) {
      console.error("Refresh token verification error:", refreshError);
      return sendSessionExpired(res, 401);
    }
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(500).json({ msg: "An error occurred", tokenStatus: 0 });
  }
};

const AdminAuth = (req, res, next) => verifyToken(req, res, next, 2);
const UserAuth = (req, res, next) => verifyToken(req, res, next, 1);

module.exports = {
  AdminAuth,
  UserAuth,
};
