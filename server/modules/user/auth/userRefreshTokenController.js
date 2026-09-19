const jwt = require("jsonwebtoken");

const Session = require("../../../models/Session");

const response = require("../../../config/response");
const { JWT_REFRESH_SECRET } = require("../../../config/config");
const { rotateRefreshToken } = require("../../../shared/utils/authUtils");
const {
  setAuthTokenCookie,
  setAuthRefreshTokenCookie,
  setSessionIDCookie,
  getCookieOptions,
} = require("../../../shared/utils/cookieUtils");
const User = require("../../../models/User");

const refreshToken = async (req, res) => {
  // Read refresh token from cookies first, fallback to request body for backward compatibility
  // Try user_ prefix first, then fallback to old cookie name
  const receivedRefreshToken =
    req.cookies?.user_refreshToken ||
    req.cookies?.refreshToken ||
    req.body.refreshToken;

  if (!receivedRefreshToken) {
    return response.errorResponse(
      res,
      { msg: "Refresh token is required." },
      "Invalid Request.",
      400,
    );
  }

  try {
    const decoded = jwt.verify(receivedRefreshToken, JWT_REFRESH_SECRET);

    const session = await Session.findOne({
      userID: decoded.id,
      refreshToken: receivedRefreshToken,
    });
    if (!session || !session.isActive) {
      return response.errorResponse(
        res,
        [{ msg: "Invalid token or session ID. Please log in again." }],
        "Invalid token.",
        401,
        false,
        { tokenStatus: 0 },
      );
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "User not found." },
        "Invalid token.",
        401,
        false,
        { tokenStatus: 0 },
      );
    }

    // Verify refresh token validity against password change timestamp
    // If password was changed after refresh token was issued, token is invalid
    if (user.passwordChangedAt) {
      const refreshTokenIssuedAt = decoded.iat * 1000; // Convert to milliseconds
      const passwordChangedAt = new Date(user.passwordChangedAt).getTime();

      if (refreshTokenIssuedAt < passwordChangedAt) {
        await Session.findByIdAndUpdate(session._id, { isActive: false });
        return response.errorResponse(
          res,
          { msg: "Your password has been changed. Please log in again." },
          "Invalid token.",
          401,
          false,
          { tokenStatus: 0 },
        );
      }
    }

    // SECURITY: Rotate refresh token - invalidate old one and generate new one
    // This prevents token reuse and replay attacks
    const { accessToken, refreshToken, sessionID } = await rotateRefreshToken(
      user,
      session,
    );

    setAuthTokenCookie(res, accessToken, "user_");
    setAuthRefreshTokenCookie(res, refreshToken, "user_");
    // Set sessionID cookie for cookie-based authentication
    setSessionIDCookie(res, sessionID, "user_");

    return response.successResponse(res, {}, "Token refreshed successfully.");
  } catch (err) {
    console.error("Error during token refresh:", err);
    return response.errorResponse(res, {}, "Invalid token.", 403, false, {
      tokenStatus: 0,
    });
  }
};

module.exports = refreshToken;
