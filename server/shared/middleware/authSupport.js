const Admin = require("../../models/Admin");
const SubAdmin = require("../../models/SubAdmin");
const User = require("../../models/User");

const SESSION_EXPIRED_PAYLOAD = {
  msg: "Session expired. Please login again.",
  tokenStatus: 0,
};

const getRoleAwareCookies = (req, role = null) => {
  if (role === 1) {
    return {
      token: req.cookies?.user_token || req.cookies?.token,
      refreshToken: req.cookies?.user_refreshToken || req.cookies?.refreshToken,
      sessionID: req.cookies?.user_sessionID || req.cookies?.sessionID,
    };
  }

  if (role === 2) {
    return {
      token: req.cookies?.admin_token || req.cookies?.token,
      refreshToken:
        req.cookies?.admin_refreshToken || req.cookies?.refreshToken,
      sessionID: req.cookies?.admin_sessionID || req.cookies?.sessionID,
    };
  }

  return {
    token: req.cookies?.user_token || req.cookies?.admin_token || req.cookies?.token,
    refreshToken:
      req.cookies?.user_refreshToken ||
      req.cookies?.admin_refreshToken ||
      req.cookies?.refreshToken,
    sessionID:
      req.cookies?.user_sessionID ||
      req.cookies?.admin_sessionID ||
      req.cookies?.sessionID,
  };
};

const sendSessionExpired = (res, statusCode = 401) =>
  res.status(statusCode).json(SESSION_EXPIRED_PAYLOAD);

const resolvePrincipalFromDecodedToken = async (decodedToken) => {
  if (!decodedToken) return { user: null, isAdmin: false, isSubAdmin: false };

  if (decodedToken.role === 2) {
    const admin = await Admin.findById(decodedToken.id);
    return { user: admin, isAdmin: Boolean(admin), isSubAdmin: false };
  }

  if (decodedToken.role === 3) {
    const subAdmin = await SubAdmin.findById(decodedToken.id);
    return { user: subAdmin, isAdmin: false, isSubAdmin: Boolean(subAdmin) };
  }

  const user = await User.findById(decodedToken.id);
  return { user, isAdmin: false, isSubAdmin: false };
};

const expectedRoleFromModel = ({ isAdmin, isSubAdmin }) => {
  if (isAdmin) return 2;
  if (isSubAdmin) return 3;
  return 1;
};

module.exports = {
  getRoleAwareCookies,
  sendSessionExpired,
  resolvePrincipalFromDecodedToken,
  expectedRoleFromModel,
};
