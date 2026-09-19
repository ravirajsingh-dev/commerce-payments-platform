// Get secure cookie options
// In development (e.g. localhost over HTTP), secure must be false or cookies are not sent by the browser
const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    // Use "lax" in dev so cookies are sent reliably (e.g. cross-port); "strict" in production for CSRF.
    sameSite: isProduction ? "strict" : "lax",
  };
};

/**
 * Set access token as an HttpOnly cookie
 * @param {Object} res - Express response object
 * @param {string} token - JWT access token
 * @param {string} prefix - Optional prefix for cookie name (e.g., "user_", "admin_")
 */
const setAuthTokenCookie = (res, token, prefix = "") => {
  const cookieName = prefix ? `${prefix}token` : "token";
  res.cookie(cookieName, token, getCookieOptions());
};

/**
 * Set refresh token as an HttpOnly cookie
 * @param {Object} res - Express response object
 * @param {string} token - JWT refresh token
 * @param {string} prefix - Optional prefix for cookie name (e.g., "user_", "admin_")
 */
const setAuthRefreshTokenCookie = (res, token, prefix = "") => {
  const cookieName = prefix ? `${prefix}refreshToken` : "refreshToken";
  res.cookie(cookieName, token, getCookieOptions());
};

/**
 * Set sessionID cookie
 * @param {Object} res - Express response object
 * @param {string} sessionID - Session ID
 * @param {string} prefix - Optional prefix for cookie name (e.g., "user_", "admin_")
 */
const setSessionIDCookie = (res, sessionID, prefix = "") => {
  const cookieName = prefix ? `${prefix}sessionID` : "sessionID";
  res.cookie(cookieName, sessionID, getCookieOptions());
};

/**
 * Clear authentication cookies (access token, refresh token, and sessionID)
 * @param {Object} res - Express response object
 * @param {string} prefix - Optional prefix for cookie names ("user_", "admin_", or empty for old cookie names)
 */
const clearAuthCookies = (res, prefix = "") => {
  if (prefix === "user_") {
    // Clear only user-prefixed cookies
    res.clearCookie("user_token", getCookieOptions());
    res.clearCookie("user_refreshToken", getCookieOptions());
    res.clearCookie("user_sessionID", getCookieOptions());
  } else if (prefix === "admin_") {
    // Clear only admin-prefixed cookies
    res.clearCookie("admin_token", getCookieOptions());
    res.clearCookie("admin_refreshToken", getCookieOptions());
    res.clearCookie("admin_sessionID", getCookieOptions());
  } else {
    // No prefix provided - clear old cookie names for backward compatibility
    res.clearCookie("token", getCookieOptions());
    res.clearCookie("refreshToken", getCookieOptions());
    res.clearCookie("sessionID", getCookieOptions());
  }
};

module.exports = {
  setAuthTokenCookie,
  setAuthRefreshTokenCookie,
  setSessionIDCookie,
  clearAuthCookies,
  getCookieOptions,
};
