const response = require("../../config/response");

/**
 * Dynamic permission checking middleware
 * Works with ANY module and action without hardcoding
 * 
 * Usage: checkPermission('users', 'list') or checkPermission('dashboard')
 * 
 * Permission structure:
 * - Admin (role 2): Full access by default
 * - SubAdmin (role 3): Permission-driven access
 * 
 * Permissions can be:
 * - { "module": true } - Full access to module
 * - { "module": false } - No access to module
 * - { "module": { "action": true } } - Access to specific action
 * - { "module": { "action": false } } - No access to specific action
 */
const checkPermission = (module, action = null) => {
  return async (req, res, next) => {
    try {
      // Admin has full access by default
      if (req.isAdmin) {
        return next();
      }

      // Sub-admin permission check
      if (req.isSubAdmin && req.userObj) {
        const permissions = req.userObj.permissions || {};

        // Check if module exists in permissions
        if (!permissions.hasOwnProperty(module)) {
          return response.errorResponse(
            res,
            { msg: `Access denied. You don't have permission to access ${module}.` },
            "Insufficient Permissions",
            403
          );
        }

        const modulePermission = permissions[module];

        // If module permission is boolean
        if (typeof modulePermission === "boolean") {
          if (modulePermission === true) {
            // Full access to module
            return next();
          } else {
            // No access to module
            return response.errorResponse(
              res,
              { msg: `Access denied. You don't have permission to access ${module}.` },
              "Insufficient Permissions",
              403
            );
          }
        }

        // If module permission is an object (action-level permissions)
        if (typeof modulePermission === "object" && modulePermission !== null) {
          // If no specific action requested, check if module has any access
          if (!action) {
            // Check if any action is allowed
            const hasAnyAccess = Object.values(modulePermission).some(
              (val) => val === true
            );
            if (hasAnyAccess) {
              return next();
            } else {
              return response.errorResponse(
                res,
                { msg: `Access denied. You don't have permission to access ${module}.` },
                "Insufficient Permissions",
                403
              );
            }
          }

          // Check specific action
          if (!modulePermission.hasOwnProperty(action)) {
            return response.errorResponse(
              res,
              {
                msg: `Access denied. You don't have permission to perform ${action} on ${module}.`,
              },
              "Insufficient Permissions",
              403
            );
          }

          if (modulePermission[action] === true) {
            return next();
          } else {
            return response.errorResponse(
              res,
              {
                msg: `Access denied. You don't have permission to perform ${action} on ${module}.`,
              },
              "Insufficient Permissions",
              403
            );
          }
        }

        // Invalid permission format
        return response.errorResponse(
          res,
          { msg: `Invalid permission configuration for ${module}.` },
          "Permission Error",
          500
        );
      }

      // Not admin or sub-admin
      return response.errorResponse(
        res,
        { msg: "Access denied. Admin or sub-admin access required." },
        "Insufficient Permissions",
        403
      );
    } catch (err) {
      console.error("Permission check error:", err);
      return response.errorResponse(res, {}, "Server Error", 500);
    }
  };
};

module.exports = {
  checkPermission,
};
