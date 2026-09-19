const Session = require("../../models/Session");
const { getClientIP } = require("../utils/auditLogger");
const { sendSessionExpired } = require("./authSupport");

const denyAccess = (res, msg) =>
  res.status(403).json({
    msg,
    tokenStatus: 0,
  });

const deactivateSession = async (sessionId) => {
  await Session.findByIdAndUpdate(sessionId, { isActive: false });
};

const enforceSessionClientBinding = async ({ req, session, res }) => {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction || (!session.ipAddress && !session.userAgent)) return true;

  const currentIP = getClientIP(req);
  const currentUserAgent = req.headers?.["user-agent"] || null;

  if (session.ipAddress && session.ipAddress !== "unknown" && currentIP !== "unknown") {
    if (session.ipAddress !== currentIP) {
      await deactivateSession(session._id);
      sendSessionExpired(res, 401);
      return false;
    }
  }

  if (session.userAgent && currentUserAgent && session.userAgent !== currentUserAgent) {
    await deactivateSession(session._id);
    sendSessionExpired(res, 401);
    return false;
  }

  return true;
};

const enforceRoleConsistency = async ({ tokenRole, expectedRole, session, res }) => {
  if (tokenRole === null) return true;
  if (tokenRole === expectedRole) return true;

  await deactivateSession(session._id);
  sendSessionExpired(res, 403);
  return false;
};

const enforceUserAccountStatus = ({ user, isAdmin, isSubAdmin, res }) => {
  const deniedMessage = "Account access denied. Please contact support.";

  if (!isAdmin && !isSubAdmin) {
    if (user.status === 3 || user.status === 2) {
      denyAccess(res, deniedMessage);
      return false;
    }
    return true;
  }

  if (isAdmin) {
    if (user.status === 2) {
      denyAccess(res, deniedMessage);
      return false;
    }
    return true;
  }

  if (user.status === 2 || !user.isActive) {
    denyAccess(res, deniedMessage);
    return false;
  }
  return true;
};

const enforcePasswordChangedAfterIssuedAt = async ({
  decodedToken,
  user,
  session,
  res,
}) => {
  if (!decodedToken || !user.passwordChangedAt) return true;

  const tokenIssuedAt = decodedToken.iat * 1000;
  const passwordChangedAt = new Date(user.passwordChangedAt).getTime();
  if (tokenIssuedAt >= passwordChangedAt) return true;

  await deactivateSession(session._id);
  sendSessionExpired(res, 401);
  return false;
};

const enforceRouteRoleAccess = ({ requiredRole, isAdmin, isSubAdmin, res }) => {
  if (requiredRole === 2 && !isAdmin && !isSubAdmin) {
    denyAccess(res, "Insufficient permissions. Admin access required.");
    return false;
  }

  if (requiredRole === 1 && (isAdmin || isSubAdmin)) {
    denyAccess(res, "Insufficient permissions. User access required.");
    return false;
  }

  return true;
};

const enforceRefreshIdentity = ({ decodedRefreshToken, user, res }) => {
  if (!decodedRefreshToken || decodedRefreshToken.id !== user._id.toString()) {
    sendSessionExpired(res, 401);
    return false;
  }

  if (user.uuid && decodedRefreshToken.uuid && user.uuid !== decodedRefreshToken.uuid) {
    sendSessionExpired(res, 401);
    return false;
  }

  return true;
};

module.exports = {
  enforceSessionClientBinding,
  enforceRoleConsistency,
  enforceUserAccountStatus,
  enforcePasswordChangedAfterIssuedAt,
  enforceRouteRoleAccess,
  enforceRefreshIdentity,
};
