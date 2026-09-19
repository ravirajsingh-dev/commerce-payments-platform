const { DEFAULT_PAGE_SIZE } = require("../../../config/constants");
const response = require("../../../config/response");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const User = require("../../../models/User");
const UserAddress = require("../../../models/UserAddress");
const Session = require("../../../models/Session");
const { listAdminOrdersByUserId } = require("../../commerce/order/orderAdminService");
const {
  getCustomerOrderAnalytics,
} = require("../../commerce/analytics/customerAnalyticsService");
const {
  getAdminUserCart,
  clearAdminUserCart,
} = require("../../commerce/cart/adminCartService");
const { processSearchFilters } = require("../adminSearchHelper");
const {
  validateEmail,
  validatePhone,
  validateAndNormalizeListFilters,
} = require("../../../shared/middleware/validateRequest");

/**
 * GET /admin/users/list
 * Get users list with pagination, search, and filters
 */
const getUsersList = async (req, res) => {
  try {
    const {
      limit = DEFAULT_PAGE_SIZE,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
    } = req.query || req.body;

    let filters = [];
    let query = {};

    if (req.query.limit) {
      if (typeof req.query.filters === "string") {
        filters = req.query.filters.split(",");
      } else if (Array.isArray(req.query.filters)) {
        filters = req.query.filters;
      }

      if (typeof req.query.query === "string") {
        try {
          query = JSON.parse(req.query.query);
        } catch (e) {
          query = {};
        }
      } else if (typeof req.query.query === "object") {
        query = req.query.query;
      } else {
        query = {};
      }
    } else {
      if (typeof req.body.filters === "string") {
        filters = req.body.filters.split(",");
      } else if (Array.isArray(req.body.filters)) {
        filters = req.body.filters;
      }

      query = typeof req.body.query === "object" ? req.body.query : {};
    }

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;
    const allowedOrderBy = new Set([
      "name",
      "phone",
      "email",
      "status",
      "createdAt",
    ]);
    const safeOrderBy = allowedOrderBy.has(String(orderBy))
      ? String(orderBy)
      : "createdAt";

    const validatedListFilters = validateAndNormalizeListFilters({
      filters,
      query,
      schema: User.schema,
      allowedFields: ["name", "phone", "email", "status", "createdAt"],
      fieldTypeMap: {
        name: "String",
        phone: "String",
        email: "String",
        status: "Number",
        createdAt: "Date",
      },
      customValidators: {
        name: (value) => {
          const normalized = String(value || "").trim();
          if (!normalized) return { valid: false, error: "Name is required." };
          if (normalized.length < 3 || normalized.length > 50) {
            return {
              valid: false,
              error: "Name must be between 3 and 50 characters.",
            };
          }
          return { valid: true, sanitized: normalized };
        },
        phone: validatePhone,
        email: validateEmail,
      },
    });

    if (!validatedListFilters.valid) {
      return response.errorResponse(
        res,
        validatedListFilters.errors,
        "Validation Error",
        400,
      );
    }

    const matchQuery = processSearchFilters(
      validatedListFilters.filters,
      validatedListFilters.query,
    );

    const usersList = await User.aggregate([
      { $match: matchQuery },
      {
        $project: {
          name: 1,
          phone: 1,
          email: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
      {
        $facet: {
          metadata: [
            { $count: "totalRecord" },
            {
              $addFields: {
                current_page: parseInt(page),
                per_page: pageSize,
              },
            },
          ],
          data: [
            { $sort: { [safeOrderBy]: sortOrder } },
            { $skip: skip },
            { $limit: pageSize },
          ],
        },
      },
    ]).collation({ locale: "en", strength: 1 });

    const summaryList = await User.aggregate([
      {
        $group: {
          _id: null,
          active: {
            $sum: {
              $cond: [{ $eq: ["$status", 1] }, 1, 0],
            },
          },
          inactive: {
            $sum: {
              $cond: [{ $eq: ["$status", 2] }, 1, 0],
            },
          },
          newUsers: {
            $sum: {
              $cond: [{ $eq: ["$status", 4] }, 1, 0],
            },
          },
          blocked: {
            $sum: {
              $cond: [{ $eq: ["$status", 3] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          active: 1,
          inactive: 1,
          newUsers: 1,
          blocked: 1,
        },
      },
    ]);

    const summaryData = summaryList?.[0] || {
      active: 0,
      inactive: 0,
      newUsers: 0,
      blocked: 0,
    };

    const [result] = usersList;

    if (result?.metadata?.length > 0) {
      return response.successResponse(
        res,
        [{ ...result, summary: [summaryData] }],
        "Users List",
      );
    } else {
      return response.successResponse(
        res,
        [
          {
            metadata: [
              { totalRecord: 0, current_page: page, per_page: pageSize },
            ],
            data: [],
            summary: [summaryData],
          },
        ],
        "No Users",
      );
    }
  } catch (err) {
    console.error("Error fetching users:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const handleOrderServiceFailure = (res, result, fallbackMessage) =>
  response.errorResponse(
    res,
    result.errors || {},
    result.message || fallbackMessage,
    result.statusCode || 400,
  );

/**
 * GET /api/admin/users/:user_id/orders
 * Paginated order history for a customer (Phase 48).
 */
const getUserOrders = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await listAdminOrdersByUserId(req.params.user_id, req.query);
    if (!result.ok) {
      return handleOrderServiceFailure(res, result, "Unable to fetch user orders.");
    }

    return response.successResponse(
      res,
      {
        orders: result.orders,
        pagination: result.pagination,
        summary: result.summary,
      },
      "User orders fetched.",
    );
  } catch (err) {
    console.error("getUserOrders:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

/**
 * GET /api/admin/users/:user_id/analytics
 * Order count, lifetime spent, AOV, first/last order dates (Phase 11).
 */
const getUserAnalytics = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await getCustomerOrderAnalytics(req.params.user_id);
    if (!result.ok) {
      return handleOrderServiceFailure(
        res,
        result,
        "Unable to fetch customer analytics.",
      );
    }

    return response.successResponse(
      res,
      { analytics: result.analytics },
      "Customer analytics fetched.",
    );
  } catch (err) {
    console.error("getUserAnalytics:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

/**
 * GET /api/admin/users/:user_id/cart
 * Read-only view of a customer's cart (Phase 46).
 */
const getUserCart = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await getAdminUserCart(req.params.user_id);
    if (!result.ok) {
      return response.errorResponse(
        res,
        result.errors || {},
        result.message || "Unable to fetch user cart.",
        result.statusCode || 400,
      );
    }

    return response.successResponse(
      res,
      {
        user: result.user,
        cart: result.cart,
        issueLabels: result.issueLabels,
      },
      "User cart fetched.",
    );
  } catch (err) {
    console.error("getUserCart:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

/**
 * DELETE /api/admin/users/:user_id/cart
 * Clears all cart lines and coupon for support (Phase 47).
 */
const clearUserCart = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const result = await clearAdminUserCart(req.params.user_id);
    if (!result.ok) {
      return response.errorResponse(
        res,
        result.errors || {},
        result.message || "Unable to clear user cart.",
        result.statusCode || 400,
      );
    }

    return response.successResponse(
      res,
      {
        cart: result.cart,
        cleared: result.cleared,
      },
      result.cleared ? "User cart cleared." : "Cart was already empty.",
    );
  } catch (err) {
    console.error("clearUserCart:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const getUserById = async (req, res) => {
  try {
    const { user_id: userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        [{ path: "user_id", msg: "Invalid user id." }],
        "Validation Error",
        400,
      );
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return response.errorResponse(
        res,
        [{ msg: "User not found." }],
        "User not found.",
        404,
      );
    }

    delete user.password;

    const addresses = await UserAddress.find({ userId: user._id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return response.successResponse(
      res,
      { ...user, addresses },
      "User details",
    );
  } catch (err) {
    console.error("Error fetching user details:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const createUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { name, phone, email, password, status = 1 } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const created = await User.create({
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: String(email).trim().toLowerCase(),
      password: hashedPassword,
      status: Number(status) || 1,
      uuid: uuidv4(),
    });

    const safeUser = created.toObject();
    delete safeUser.password;

    return response.successResponse(
      res,
      safeUser,
      "User created successfully.",
    );
  } catch (err) {
    console.error("Error creating user:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const updateUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { user_id: userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        [{ path: "user_id", msg: "Invalid user id." }],
        "Validation Error",
        400,
      );
    }

    const { name, phone, email, password, status } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (email !== undefined) updates.email = String(email).trim().toLowerCase();
    if (status !== undefined) updates.status = Number(status);

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
      updates.passwordChangedAt = new Date();
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { returnDocument: "after", runValidators: true },
    ).lean();

    if (!updated) {
      return response.errorResponse(
        res,
        [{ msg: "User not found." }],
        "User not found.",
        404,
      );
    }

    delete updated.password;

    if (password) {
      // Force user re-login on password change across all devices
      await Session.deleteMany({ userID: userId });
    }

    return response.successResponse(res, updated, "User updated successfully.");
  } catch (err) {
    console.error("Error updating user:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const deleteUser = async (req, res) => {
  try {
    const { user_id: userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        [{ path: "user_id", msg: "Invalid user id." }],
        "Validation Error",
        400,
      );
    }

    const deleted = await User.findByIdAndDelete(userId).lean();
    if (!deleted) {
      return response.errorResponse(
        res,
        [{ msg: "User not found." }],
        "User not found.",
        404,
      );
    }

    return response.successResponse(res, {}, "User deleted successfully.");
  } catch (err) {
    console.error("Error deleting user:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  getUsersList,
  getUserById,
  getUserAnalytics,
  getUserOrders,
  getUserCart,
  clearUserCart,
  createUser,
  updateUser,
  deleteUser,
};
