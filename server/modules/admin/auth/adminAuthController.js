const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
const Admin = require("../../../models/Admin");
const {
  resolveAdminPrincipal,
  sanitizeAuthenticatedAdmin,
} = require("./adminAuthLoginService");
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

module.exports.adminLogin = async (req, res) => {
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
    const { admin_id, password } = req.body;

    if (!admin_id || !password) {
      return response.errorResponse(
        res,
        { msg: "Invalid credentials" },
        "Invalid credentials",
        400,
      );
    }

    // Check brute-force protection before processing login
    const bruteForceCheck = await checkBruteForceProtection(admin_id);
    if (bruteForceCheck.isBlocked) {
      // Log blocked login attempt
      logSecurityEvent({
        eventType: EVENT_TYPES.ADMIN_LOGIN_FAILURE,
        status: "fail",
        req,
        details: {
          reason:
            "Account temporarily blocked due to too many failed login attempts",
          admin_id,
          blockedUntil: bruteForceCheck.blockedUntil,
        },
      });

      return response.errorResponse(
        res,
        [
          {
            path: "admin_id",
            msg: `Account temporarily locked due to too many failed login attempts. Please try again after ${bruteForceCheck.remainingMinutes} minute(s).`,
          },
        ],
        "Account temporarily locked",
        429,
      );
    }

    // Admin/SubAdmin authentication must use admin_id only - validation already done in middleware
    // Use admin from request if available (set by validation middleware), otherwise query
    const resolvedPrincipal = await resolveAdminPrincipal({
      adminId: admin_id,
      preloadedAdmin: req.admin,
    });
    let user = resolvedPrincipal.user;
    let isSubAdmin = resolvedPrincipal.isSubAdmin;

    if (!user) {
      // Record failed login attempt
      await recordFailedAttempt(admin_id);

      // Log failed admin login attempt
      logSecurityEvent({
        eventType: EVENT_TYPES.ADMIN_LOGIN_FAILURE,
        status: "fail",
        req,
        details: { reason: "Admin not found", admin_id },
      });

      return response.errorResponse(
        res,
        { msg: "Invalid credentials" },
        "Invalid credentials",
        401,
      );
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      // Record failed login attempt
      await recordFailedAttempt(admin_id);

      // Log failed admin login attempt (invalid password)
      logSecurityEvent({
        eventType: EVENT_TYPES.ADMIN_LOGIN_FAILURE,
        status: "fail",
        adminID: user._id.toString(),
        req,
        details: { reason: "Invalid password", admin_id, isSubAdmin },
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

    // Check if admin/sub-admin is inactive
    if (isSubAdmin) {
      if (user.status === 2 || !user.isActive) {
        // Record failed login attempt
        await recordFailedAttempt(admin_id);

        // Log failed admin login attempt (inactive account)
        logSecurityEvent({
          eventType: EVENT_TYPES.ADMIN_LOGIN_FAILURE,
          status: "fail",
          adminID: user._id.toString(),
          req,
          details: { reason: "Account inactive", admin_id, isSubAdmin: true },
        });

        return response.errorResponse(
          res,
          [
            {
              path: "admin_id",
              msg: "Account access denied. Please contact support.",
            },
          ],
          "Account access denied",
          403,
        );
      }
    } else {
      if (user.status === 2) {
        // Record failed login attempt
        await recordFailedAttempt(admin_id);

        // Log failed admin login attempt (inactive account)
        logSecurityEvent({
          eventType: EVENT_TYPES.ADMIN_LOGIN_FAILURE,
          status: "fail",
          adminID: user._id.toString(),
          req,
          details: { reason: "Account inactive", admin_id, isSubAdmin: false },
        });

        return response.errorResponse(
          res,
          [
            {
              path: "admin_id",
              msg: "Account access denied. Please contact support.",
            },
          ],
          "Account access denied",
          403,
        );
      }
    }

    const { accessToken, refreshToken, sessionID } = await generateTokens(
      user,
      req,
    );

    // Reset brute-force protection on successful login
    await resetAttempts(admin_id);

    // Update last_login field
    user.last_login = new Date();
    await user.save();

    // Log successful admin login
    logSecurityEvent({
      eventType: EVENT_TYPES.ADMIN_LOGIN_SUCCESS,
      status: "success",
      adminID: user._id.toString(),
      req,
      details: { admin_id, isSubAdmin },
    });

    const sanitizedUser = sanitizeAuthenticatedAdmin(user, isSubAdmin);

    setAuthTokenCookie(res, accessToken, "admin_");
    setAuthRefreshTokenCookie(res, refreshToken, "admin_");
    // Set sessionID cookie for cookie-based authentication
    setSessionIDCookie(res, sessionID, "admin_");

    return response.successResponse(
      res,
      { user: sanitizedUser },
      "Login successful",
    );
  } catch (err) {
    console.error("Admin login error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports.checkAuth = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }

    // Find the admin or sub-admin by ID based on role
    let admin;
    if (userRole === 2) {
      admin = await Admin.findById(userId).select("-password").lean();
    } else if (userRole === 3) {
      admin = await SubAdmin.findById(userId).select("-password").lean();
      if (admin) {
        admin.isSubAdmin = true;
      }
    } else {
      // Fallback: try both
      admin = await Admin.findById(userId).select("-password").lean();
      if (!admin) {
        admin = await SubAdmin.findById(userId).select("-password").lean();
        if (admin) {
          admin.isSubAdmin = true;
        }
      }
    }

    // If admin/sub-admin is not found, return error
    if (!admin) {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        404,
      );
    }

    return response.successResponse(res, admin, "Admin details");
  } catch (err) {
    console.error("Check auth error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports.logout = async (req, res) => {
  // Read refresh token from cookies first, fallback to request body for backward compatibility
  // Try admin_ prefix first, then fallback to old cookie name
  const refreshToken =
    req.cookies?.admin_refreshToken ||
    req.cookies?.refreshToken ||
    req.body.refreshToken;

  if (!refreshToken) {
    return response.errorResponse(
      res,
      { msg: "Refresh token is required." },
      "Invalid Request.",
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
        adminID: decoded.id.toString(),
        req,
        details: { sessionID: deletedSession.sessionID },
      });
    }

    // Clear authentication cookies - only clear admin_ prefixed cookies
    clearAuthCookies(res, "admin_");

    return response.successResponse(res, {}, "Logged out successfully.");
  } catch (err) {
    console.error("Admin logout error:", err);
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
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }

    // Delete all sessions for this admin (logout from all devices)
    const deletedCount = await Session.deleteMany({ userID: userId });

    // Log session removal (all devices)
    logSecurityEvent({
      eventType: EVENT_TYPES.SESSION_REMOVED_ALL,
      status: "success",
      adminID: userId.toString(),
      req,
      details: { sessionsRemoved: deletedCount.deletedCount || 0 },
    });

    return response.successResponse(
      res,
      {},
      "Logged out from all devices successfully.",
    );
  } catch (err) {
    console.error("Admin logout all error:", err);
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
    const userRole = req.user.role;

    const { currentPassword, newPassword } = req.body;

    // Find user based on role - Admin (role 2) or SubAdmin (role 3)
    let user;
    if (userRole === 2) {
      user = await Admin.findById(userId);
    } else if (userRole === 3) {
      user = await SubAdmin.findById(userId);
    } else {
      return response.errorResponse(
        res,
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }

    // Verify current password
    const validPassword = await comparePasswords(
      currentPassword,
      user.password,
    );

    if (!validPassword) {
      return response.errorResponse(
        res,
        [
          {
            path: "currentPassword",
            msg: "Invalid credentials",
          },
        ],
        "Invalid credentials",
        400,
      );
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password based on role
    let updatedUser;
    if (userRole === 2) {
      updatedUser = await Admin.findByIdAndUpdate(
        { _id: userId },
        {
          password: hashedPassword,
          passwordChangedAt: new Date(), // Track password change timestamp
        },
        { returnDocument: "after" },
      ).lean();
    } else {
      updatedUser = await SubAdmin.findByIdAndUpdate(
        { _id: userId },
        {
          password: hashedPassword,
          passwordChangedAt: new Date(), // Track password change timestamp
        },
        { returnDocument: "after" },
      ).lean();
    }

    if (!updatedUser) {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        401,
      );
    }

    // Invalidate all sessions for this admin/sub-admin after password change
    // This ensures all devices are logged out immediately
    await Session.deleteMany({ userID: userId });

    // Log password change
    logSecurityEvent({
      eventType: EVENT_TYPES.ADMIN_PASSWORD_CHANGE,
      status: "success",
      adminID: userId.toString(),
      req,
      details: { userRole },
    });

    return response.successResponse(res, {}, "Password changed successfully.");
  } catch (err) {
    console.error("Admin change password error:", err);
    return response.errorResponse(res, {}, "An error occurred", 403);
  }
};

module.exports.setTxnPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(
      res,
      sanitizeValidationErrors(errors.array()),
    );
  }

  try {
    const userId = req.user.id;

    const { txn_password } = req.body;

    const user = await Admin.findById(userId);

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }

    const salt = await bcrypt.genSalt(10);
    const txnPasswordHash = await bcrypt.hash(txn_password, salt);

    let updatedUser = await Admin.findByIdAndUpdate(
      { _id: user._id },
      {
        txn_password: txnPasswordHash,
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

    return response.successResponse(
      res,
      {},
      "Set Transaction Password successfully.",
    );
  } catch (err) {
    console.error("Admin set transaction password error:", err);
    return response.errorResponse(res, {}, "An error occurred", 403);
  }
};

module.exports.changeTnxPassword = async (req, res) => {
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
    const userRole = req.user.role;

    const { currentTxnPassword, newTxnPassword } = req.body;

    // Find user based on role - Admin (role 2) or SubAdmin (role 3)
    let user;
    if (userRole === 2) {
      user = await Admin.findById(userId);
    } else if (userRole === 3) {
      user = await SubAdmin.findById(userId);
    } else {
      return response.errorResponse(
        res,
        { msg: "Invalid user role" },
        "Invalid user role",
        400,
      );
    }

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "Invalid user ID" },
        "Invalid user ID",
        400,
      );
    }

    // Check if transaction password is set
    if (!user.txn_password) {
      return response.errorResponse(
        res,
        [
          {
            path: "currentTxnPassword",
            msg: "Transaction password not set. Please set your transaction password first.",
          },
        ],
        "Transaction Password Not Set.",
        400,
      );
    }

    // Verify current transaction password
    const validPassword = await comparePasswords(
      currentTxnPassword,
      user.txn_password,
    );

    if (!validPassword) {
      return response.errorResponse(
        res,
        [
          {
            path: "currentTxnPassword",
            msg: "Incorrect transaction password. Please double-check your credentials and try again.",
          },
        ],
        "Incorrect Transaction Password.",
        400,
      );
    }

    // Hash new transaction password
    const salt = await bcrypt.genSalt(10);
    const newTnxPasswordHash = await bcrypt.hash(newTxnPassword, salt);

    // Update transaction password based on role
    let updatedUser;
    if (userRole === 2) {
      updatedUser = await Admin.findByIdAndUpdate(
        { _id: userId },
        {
          txn_password: newTnxPasswordHash,
        },
        { returnDocument: "after" },
      ).lean();
    } else {
      updatedUser = await SubAdmin.findByIdAndUpdate(
        { _id: userId },
        {
          txn_password: newTnxPasswordHash,
        },
        { returnDocument: "after" },
      ).lean();
    }

    if (!updatedUser) {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        401,
      );
    }

    // Invalidate all sessions for this admin/sub-admin after transaction password change
    // This ensures all devices are logged out immediately
    await Session.deleteMany({ userID: userId });

    // Log transaction password change
    logSecurityEvent({
      eventType: EVENT_TYPES.ADMIN_TXN_PASSWORD_CHANGE,
      status: "success",
      adminID: userId.toString(),
      req,
      details: { userRole },
    });

    return response.successResponse(
      res,
      {},
      "Transaction password changed successfully. Please log in again.",
    );
  } catch (err) {
    console.error("Admin change transaction password error:", err);
    return response.errorResponse(res, {}, "An error occurred", 403);
  }
};

// Combined change password and transaction password (Admin/SubAdmin)
module.exports.changePasswordAndTxnPassword = async (req, res) => {
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
    const userRole = req.user.role;

    const {
      currentPassword,
      newPassword,
      confirmPassword,
      currentTxnPassword,
      newTxnPassword,
      confirmTxnPassword,
    } = req.body;

    // Find user based on role - Admin (role 2) or SubAdmin (role 3)
    let user;
    if (userRole === 2) {
      user = await Admin.findById(userId);
    } else if (userRole === 3) {
      user = await SubAdmin.findById(userId);
    } else {
      return response.errorResponse(
        res,
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "Invalid request" },
        "Invalid request",
        400,
      );
    }

    // Verify current login password
    const validPassword = await comparePasswords(
      currentPassword,
      user.password,
    );

    if (!validPassword) {
      return response.errorResponse(
        res,
        [
          {
            path: "currentPassword",
            msg: "Invalid credentials",
          },
        ],
        "Invalid credentials",
        400,
      );
    }

    // Verify current transaction password
    if (!user.txn_password) {
      return response.errorResponse(
        res,
        [
          {
            path: "currentTxnPassword",
            msg: "Transaction password not set. Please set your transaction password first.",
          },
        ],
        "Transaction Password Not Set.",
        400,
      );
    }

    const validTxnPassword = await comparePasswords(
      currentTxnPassword,
      user.txn_password,
    );

    if (!validTxnPassword) {
      return response.errorResponse(
        res,
        [
          {
            path: "currentTxnPassword",
            msg: "Invalid credentials",
          },
        ],
        "Invalid credentials",
        400,
      );
    }

    // Hash new login password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Hash new transaction password
    const hashedTxnPassword = await bcrypt.hash(newTxnPassword, salt);

    // Update both passwords based on role
    let updatedUser;
    if (userRole === 2) {
      updatedUser = await Admin.findByIdAndUpdate(
        { _id: userId },
        {
          password: hashedPassword,
          txn_password: hashedTxnPassword,
          passwordChangedAt: new Date(), // Track password change timestamp
        },
        { returnDocument: "after" },
      ).lean();
    } else {
      // SubAdmin - update both passwords
      updatedUser = await SubAdmin.findByIdAndUpdate(
        { _id: userId },
        {
          password: hashedPassword,
          txn_password: hashedTxnPassword,
          passwordChangedAt: new Date(),
        },
        { returnDocument: "after" },
      ).lean();
    }

    if (!updatedUser) {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        401,
      );
    }

    // Invalidate ALL sessions for this admin/sub-admin after password change
    // This ensures all devices are logged out immediately (global logout)
    await Session.deleteMany({ userID: userId });

    // Log both password changes
    logSecurityEvent({
      eventType: EVENT_TYPES.ADMIN_PASSWORD_CHANGE,
      status: "success",
      adminID: userId.toString(),
      req,
      details: { userRole, combined: true },
    });
    logSecurityEvent({
      eventType: EVENT_TYPES.ADMIN_TXN_PASSWORD_CHANGE,
      status: "success",
      adminID: userId.toString(),
      req,
      details: { userRole, combined: true },
    });

    return response.successResponse(
      res,
      {},
      "Password and transaction password changed successfully. Please log in again.",
    );
  } catch (err) {
    console.error("Admin change password and transaction password error:", err);
    return response.errorResponse(res, {}, "An error occurred", 403);
  }
};
