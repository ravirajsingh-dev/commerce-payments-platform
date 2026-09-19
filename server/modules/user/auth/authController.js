const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../../../models/User");
const Session = require("../../../models/Session");

const { JWT_REFRESH_SECRET } = require("../../../config/config");
const response = require("../../../config/response");
const { generateTokens } = require("../../../shared/utils/authUtils");
const {
  logSecurityEvent,
  EVENT_TYPES,
} = require("../../../shared/utils/auditLogger");

const { comparePasswords } = require("../../../shared/utils/helper");
const {
  setAuthTokenCookie,
  setAuthRefreshTokenCookie,
  setSessionIDCookie,
  clearAuthCookies,
  getCookieOptions,
} = require("../../../shared/utils/cookieUtils");
const CommonSettings = require("../../../models/CommonSettings");
const {
  sanitizeError,
  sanitizeAuthError,
  sanitizeValidationErrors,
} = require("../../../shared/utils/errorSanitizer");
const {
  checkBruteForceProtection,
  recordFailedAttempt,
  resetAttempts,
} = require("../../../shared/utils/bruteForceProtection");

module.exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      sanitizeValidationErrors(errors.array()),
      "Validation Error",
      400,
    );
  }

  try {
    // Check if login is enabled
    const settings = await CommonSettings.getOrCreateSettings();
    if (!settings.loginEnabled) {
      return response.errorResponse(
        res,
        {
          msg: "Service temporarily unavailable. Please contact administrator.",
        },
        "Service temporarily unavailable.",
        503,
      );
    }

    const { phone, password } = req.body;

    if (!phone || !password) {
      return response.errorResponse(
        res,
        { msg: "Invalid credentials" },
        "Invalid credentials",
        400,
      );
    }

    const phoneStr = String(phone).trim();

    // Check brute-force protection before processing login
    const bruteForceCheck = await checkBruteForceProtection(phoneStr);
    if (bruteForceCheck.isBlocked) {
      // Log blocked login attempt
      logSecurityEvent({
        eventType: EVENT_TYPES.USER_LOGIN_FAILURE,
        status: "fail",
        req,
        details: {
          reason:
            "Account temporarily blocked due to too many failed login attempts",
          phone: phoneStr,
          blockedUntil: bruteForceCheck.blockedUntil,
        },
      });

      return response.errorResponse(
        res,
        [
          {
            path: "phone",
            msg: `Account temporarily locked due to too many failed login attempts. Please try again after ${bruteForceCheck.remainingMinutes} minute(s).`,
          },
        ],
        "Account temporarily locked",
        429,
      );
    }

    const user = await User.findOne({ phone: phoneStr });

    if (!user) {
      await recordFailedAttempt(phoneStr);

      logSecurityEvent({
        eventType: EVENT_TYPES.USER_LOGIN_FAILURE,
        status: "fail",
        req,
        details: { reason: "User not found", phone: phoneStr },
      });

      return response.errorResponse(
        res,
        [
          {
            path: "phone",
            msg: "Invalid credentials",
          },
        ],
        "Invalid credentials",
        401,
      );
    }

    // Check user status
    // status = 3 (Blocked) → block login
    if (user.status === 3) {
      await recordFailedAttempt(phoneStr);

      logSecurityEvent({
        eventType: EVENT_TYPES.USER_LOGIN_FAILURE,
        status: "fail",
        userID: user._id.toString(),
        req,
        details: { reason: "Account blocked", phone: phoneStr },
      });

      return response.errorResponse(
        res,
        [
          {
            path: "phone",
            msg: "Account access denied. Please contact support.",
          },
        ],
        "Account access denied",
        403,
      );
    }

    // status = 2 (Inactive) → block login
    if (user.status === 2) {
      await recordFailedAttempt(phoneStr);

      logSecurityEvent({
        eventType: EVENT_TYPES.USER_LOGIN_FAILURE,
        status: "fail",
        userID: user._id.toString(),
        req,
        details: { reason: "Account inactive", phone: phoneStr },
      });

      return response.errorResponse(
        res,
        [
          {
            path: "phone",
            msg: "Account access denied. Please contact support.",
          },
        ],
        "Account access denied",
        403,
      );
    }

    // status = 1 (Active) or status = 4 (New) → allow login

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      await recordFailedAttempt(phoneStr);

      logSecurityEvent({
        eventType: EVENT_TYPES.USER_LOGIN_FAILURE,
        status: "fail",
        userID: user._id.toString(),
        req,
        details: { reason: "Invalid password", phone: phoneStr },
      });

      return response.errorResponse(
        res,
        [
          {
            path: "password",
            msg: "Invalid credentials",
          },
        ],
        "Invalid credentials",
        400,
      );
    }

    const { accessToken, refreshToken, sessionID } = await generateTokens(
      user,
      req,
    );

    // Reset brute-force protection on successful login
    await resetAttempts(phoneStr);

    // Update last_login field
    user.last_login = new Date();
    await user.save();

    logSecurityEvent({
      eventType: EVENT_TYPES.USER_LOGIN_SUCCESS,
      status: "success",
      userID: user._id.toString(),
      req,
      details: { phone: phoneStr },
    });

    // Create sanitized user object without sensitive fields
    const sanitizedUser = user.toObject();
    delete sanitizedUser.password;

    setAuthTokenCookie(res, accessToken, "user_");
    setAuthRefreshTokenCookie(res, refreshToken, "user_");
    // Set sessionID cookie for cookie-based authentication
    setSessionIDCookie(res, sessionID, "user_");

    return response.successResponse(
      res,
      { user: sanitizedUser },
      "Login successful",
    );
  } catch (err) {
    console.error("Login error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports.checkAuth = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }

    // Find the user by ID
    const user = await User.findById(userId).select("-password").lean();

    // If user is not found, return error
    if (!user) {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        404,
      );
    }

    return response.successResponse(res, user, "User details");
  } catch (err) {
    console.error("Check auth error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports.logout = async (req, res) => {
  // Read refresh token from cookies first, fallback to request body for backward compatibility
  // Try user_ prefix first, then fallback to old cookie name
  const refreshToken =
    req.cookies?.user_refreshToken ||
    req.cookies?.refreshToken ||
    req.body.refreshToken;

  if (!refreshToken) {
    return response.errorResponse(
      res,
      { msg: "Invalid request" },
      "Invalid request",
      400,
    );
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    const deletedSession = await Session.findOneAndDelete({
      userID: decoded.id,
      refreshToken,
    });

    // Log session removal
    if (deletedSession) {
      logSecurityEvent({
        eventType: EVENT_TYPES.SESSION_REMOVED,
        status: "success",
        userID: decoded.id.toString(),
        req,
        details: { sessionID: deletedSession.sessionID },
      });
    }

    // Clear authentication cookies - only clear user_ prefixed cookies
    clearAuthCookies(res, "user_");

    return response.successResponse(res, {}, "Logged out successfully.");
  } catch (err) {
    console.error("Logout error:", err);
    return response.errorResponse(
      res,
      {},
      "Session expired. Please login again.",
      403,
    );
  }
};

module.exports.logoutAll = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "Invalid user ID" },
        "Invalid user ID",
        400,
      );
    }

    // Delete all sessions for this user (logout from all devices)
    const deletedCount = await Session.deleteMany({ userID: userId });

    // Log session removal (all devices)
    logSecurityEvent({
      eventType: EVENT_TYPES.SESSION_REMOVED_ALL,
      status: "success",
      userID: userId.toString(),
      req,
      details: { sessionsRemoved: deletedCount.deletedCount || 0 },
    });

    return response.successResponse(
      res,
      {},
      "Logged out from all devices successfully.",
    );
  } catch (err) {
    console.error("Logout all error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports.changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      sanitizeValidationErrors(errors.array()),
      "Validation Error",
      400,
    );
  }
  try {
    const userId = req.user.id;

    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }

    const { oldPassword, password } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }

    const validPassword = await comparePasswords(oldPassword, user.password);

    if (!validPassword) {
      return response.errorResponse(
        res,
        [
          {
            path: "oldPassword",
            msg: "Invalid credentials",
          },
        ],
        "Invalid credentials",
        400,
      );
    }

    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash(password, salt);

    let updatedUser = await User.findByIdAndUpdate(
      { _id: userId },
      {
        password: newPassword,
        passwordChangedAt: new Date(), // Track password change timestamp
      },
      { returnDocument: "after" },
    ).lean();

    if (!updatedUser) {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        401,
      );
    }

    // Invalidate all sessions for this user after password change
    // This ensures all devices are logged out immediately
    await Session.deleteMany({ userID: userId });

    // Log password change
    logSecurityEvent({
      eventType: EVENT_TYPES.USER_PASSWORD_CHANGE,
      status: "success",
      userID: userId.toString(),
      req,
    });

    return response.successResponse(res, {}, "Password change successfully.");
  } catch (err) {
    console.error("Change password error:", err);
    return response.errorResponse(res, {}, "An error occurred", 403);
  }
};

module.exports.forgotPasswordStep1 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      sanitizeValidationErrors(errors.array()),
      "Validation Error",
      400,
    );
  }

  const { phone } = req.body;

  try {
    if (!phone) {
      return response.errorResponse(
        res,
        [{ path: "phone", msg: "Required field missing" }],
        "Validation Error",
        400,
      );
    }

    const user = await User.findOne({ phone }).select("phone").lean();

    if (!user || !user.phone) {
      return response.errorResponse(
        res,
        [{ path: "phone", msg: "Invalid credentials" }],
        "Invalid credentials",
        404,
      );
    }

    const phoneStr = user.phone.toString();
    const maskedPhone = phoneStr.slice(-4); // last 4 digits

    return response.successResponse(res, { maskedPhone }, "Phone Verified.");
  } catch (err) {
    console.error("Error in forgotPasswordStep1:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports.forgotPasswordStep2 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      sanitizeValidationErrors(errors.array()),
      "Validation Error",
      400,
    );
  }

  try {
    return response.errorResponse(
      res,
      [
        {
          path: "phone",
          msg: "This reset method is disabled. Use OTP-based reset endpoint.",
        },
      ],
      "Legacy password reset is disabled. Please use OTP-based reset flow.",
      410,
    );
  } catch (err) {
    console.error("Error in forgotPasswordStep2:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};
