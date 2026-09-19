const { JWT_ACCESS_SECRET } = require("../../../config/config");
const User = require("../../../models/User");
const { getRoleAwareCookies } = require("../../../shared/middleware/authSupport");
const { verifyTokenSafely } = require("../../../shared/middleware/authTokenService");

/**
 * Attaches req.user / req.userObj when a valid, non-expired user access token is present.
 * Does not reject the request when auth is missing or invalid (guest cart path).
 */
const OptionalUserAuth = async (req, res, next) => {
  const { token } = getRoleAwareCookies(req, 1);
  if (!token) {
    return next();
  }

  try {
    const verified = verifyTokenSafely(token, JWT_ACCESS_SECRET);
    if (verified.error || !verified.decoded) {
      return next();
    }
    if (Number(verified.decoded.role) !== 1) {
      return next();
    }

    const user = await User.findById(verified.decoded.id);
    if (!user) {
      return next();
    }

    req.user = verified.decoded;
    req.userObj = user;
  } catch (_err) {
    // Treat as guest
  }

  return next();
};

module.exports = {
  OptionalUserAuth,
};
