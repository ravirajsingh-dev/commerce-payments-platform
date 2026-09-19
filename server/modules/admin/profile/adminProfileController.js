const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const response = require("../../../config/response");
const Admin = require("../../../models/Admin");
const SubAdmin = require("../../../models/SubAdmin");

const SENSITIVE_FIELDS = "-password";

const getCurrentModel = (role) => {
  if (role === 3) return SubAdmin;
  return Admin;
};

const sanitizeProfile = (doc) => {
  if (!doc) return null;
  const cleaned = doc.toObject ? doc.toObject() : doc;
  delete cleaned.password;
  return cleaned;
};

const getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        [{ path: "id", msg: "Invalid user id." }],
        "Validation Error",
        400,
      );
    }

    const Model = getCurrentModel(role);
    const profile = await Model.findById(userId)
      .select(SENSITIVE_FIELDS)
      .lean();
    if (!profile) {
      return response.errorResponse(
        res,
        [{ msg: "Profile not found." }],
        "Profile not found.",
        404,
      );
    }

    return response.successResponse(
      res,
      sanitizeProfile(profile),
      "Profile details",
    );
  } catch (err) {
    console.error("Error in getMyProfile:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const updateMyProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        [{ path: "id", msg: "Invalid user id." }],
        "Validation Error",
        400,
      );
    }

    const Model = getCurrentModel(role);
    const existingProfile = await Model.findById(userId).lean();
    if (!existingProfile) {
      return response.errorResponse(
        res,
        [{ msg: "Profile not found." }],
        "Profile not found.",
        404,
      );
    }

    const updates = {};
    const { name, phone, email } = req.body;

    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (email !== undefined) updates.email = String(email).trim().toLowerCase();

    if (updates.phone) {
      const [adminPhone, subAdminPhone] = await Promise.all([
        Admin.findOne({ phone: updates.phone, _id: { $ne: userId } }).lean(),
        SubAdmin.findOne({ phone: updates.phone, _id: { $ne: userId } }).lean(),
      ]);

      if (adminPhone || subAdminPhone) {
        return response.errorResponse(
          res,
          [{ path: "phone", msg: "Provided phone is already registered." }],
          "Validation Error",
          400,
        );
      }
    }

    if (updates.email) {
      const [adminEmail, subAdminEmail] = await Promise.all([
        Admin.findOne({ email: updates.email, _id: { $ne: userId } }).lean(),
        SubAdmin.findOne({ email: updates.email, _id: { $ne: userId } }).lean(),
      ]);

      if (adminEmail || subAdminEmail) {
        return response.errorResponse(
          res,
          [{ path: "email", msg: "Provided email is already registered." }],
          "Validation Error",
          400,
        );
      }
    }

    const updatedProfile = await Model.findByIdAndUpdate(
      userId,
      { $set: updates },
      { returnDocument: "after", runValidators: true },
    )
      .select(SENSITIVE_FIELDS)
      .lean();

    return response.successResponse(
      res,
      sanitizeProfile(updatedProfile),
      "Profile updated successfully.",
    );
  } catch (err) {
    console.error("Error in updateMyProfile:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
};
