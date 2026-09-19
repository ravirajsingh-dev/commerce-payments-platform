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
const Admin = require("../../../models/Admin");
const SubAdmin = require("../../../models/SubAdmin");

const adminRefreshToken = async (req, res) => {
  // Read refresh token from cookies first, fallback to request body for backward compatibility
  // Try admin_ prefix first, then fallback to old cookie name
  const receivedRefreshToken =
    req.cookies?.admin_refreshToken ||
    req.cookies?.refreshToken ||
    req.body.refreshToken;

  if (!receivedRefreshToken) {
    return response.errorResponse(
      res,
      [{ msg: "Refresh token is required." }],
      "Invalid Request.",
      400,
    );
  }

  try {
    const decoded = jwt.verify(receivedRefreshToken, JWT_REFRESH_SECRET);

    const session = await Session.findOne({
      userID: decoded.id,
      refreshToken: receivedRefreshToken,
      role: decoded.role,
    });
    if (!session || !session.isActive) {
      return response.errorResponse(
        res,
        [
          {
            msg: "Invalid token or session ID. Please log in again.",
          },
        ],
        "Invalid token.",
        401,
      );
    }

    // Detect user role from token and query appropriate collection
    let admin;
    if (decoded.role === 2) {
      // Admin
      admin = await Admin.findById(decoded.id);
    } else if (decoded.role === 3) {
      // SubAdmin
      admin = await SubAdmin.findById(decoded.id);
    } else {
      // Fallback: try Admin first, then SubAdmin
      admin = await Admin.findById(decoded.id);
      if (!admin) {
        admin = await SubAdmin.findById(decoded.id);
      }
    }

    if (!admin) {
      return response.errorResponse(
        res,
        [{ msg: "Admin not found." }],
        "Admin not found.",
        401,
      );
    }

    // Verify refresh token validity against password change timestamp
    // If password was changed after refresh token was issued, token is invalid
    if (admin.passwordChangedAt) {
      const refreshTokenIssuedAt = decoded.iat * 1000; // Convert to milliseconds
      const passwordChangedAt = new Date(admin.passwordChangedAt).getTime();

      if (refreshTokenIssuedAt < passwordChangedAt) {
        // Refresh token was issued before password change - invalidate session
        await Session.findByIdAndUpdate(session._id, { isActive: false });
        return response.errorResponse(
          res,
          [{ msg: "Your password has been changed. Please log in again." }],
          "Invalid token.",
          401,
        );
      }
    }

    // SECURITY: Rotate refresh token - invalidate old one and generate new one
    // This prevents token reuse and replay attacks
    const { accessToken, refreshToken, sessionID } = await rotateRefreshToken(
      admin,
      session,
    );

    setAuthTokenCookie(res, accessToken, "admin_");
    setAuthRefreshTokenCookie(res, refreshToken, "admin_");
    // Set sessionID cookie for cookie-based authentication
    setSessionIDCookie(res, sessionID, "admin_");

    return response.successResponse(res, {}, "Token refreshed successfully.");
  } catch (err) {
    console.error("Error during token refresh:", err);
    return response.errorResponse(res, {}, "Invalid token.", 403);
  }
};

module.exports = adminRefreshToken;
