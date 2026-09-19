const Session = require("../../models/Session");
const response = require("../../config/response");
const { sanitizeError } = require("../utils/errorSanitizer");

const checkSessionExpiry = async (req, res, next) => {
  try {
    // Read sessionID from cookies only - no header fallback
    // Determine which cookies to check based on route type
    let sessionID;
    
    // If req.user exists (from auth middleware), use role to determine cookie priority
    // For USER routes (role === 1 or no role): Only read user_sessionID (fallback to sessionID)
    // For ADMIN routes (role === 2 or 3): Only read admin_sessionID (fallback to sessionID)
    if (req.user) {
      const userRole = req.user.role;
      if (userRole === 2 || userRole === 3) {
        // ADMIN/SUBADMIN routes: Only read admin_sessionID or old sessionID - NEVER read user_sessionID
        sessionID = req.cookies?.admin_sessionID || req.cookies?.sessionID;
      } else {
        // USER routes (role === 1 or undefined): Only read user_sessionID or old sessionID - NEVER read admin_sessionID
        sessionID = req.cookies?.user_sessionID || req.cookies?.sessionID;
      }
    } else {
      // If req.user doesn't exist yet (global middleware case), try both prefixed cookies with fallback
      // This handles the case where checkSessionExpiry runs before auth middleware
      sessionID = req.cookies?.user_sessionID || req.cookies?.admin_sessionID || req.cookies?.sessionID;
    }
    if (!sessionID) {
      return res.status(401).json({ 
        msg: "Session expired. Please login again.",
        tokenStatus: 0,
      });
    }

    const session = await Session.findOne({ sessionID });

    if (!session) {
      return res.status(401).json({
        status: false,
        message: "Session expired",
        errors: [{ msg: "Session expired. Please login again." }],
        tokenStatus: 0,
      });
    }

    // Do NOT deactivate session when refreshTokenExpiresAt is past. Actual expiry
    // is enforced by JWT verify in refresh-token; prematurely setting isActive = false
    // would force unnecessary re-login even when refresh token JWT is still valid.
    next();
  } catch (err) {
    console.error("Session expiry check error:", err);
    next(err);
  }
};

module.exports = { checkSessionExpiry };
