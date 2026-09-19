const { validationResult } = require("express-validator");
var response = require("../../config/response");

const User = require("../../models/User");

const updateUserById = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = req.user.id;

    const { name, email, phone, state } = req.body;

    const userFields = {
      name,
      email,
      phone,
      state,
    };

    const user = await User.findByIdAndUpdate(
      { _id: userId },
      { $set: userFields },
      { returnDocument: "after" },
    )
      .select("-password")
      .lean();

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "User not found." },
        "User not found.",
        400,
      );
    }

    return response.successResponse(res, user, "User Updated.");
  } catch (err) {
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const updateAvatarByUserId = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = req.user.id;

    const { avatar } = req.body;

    const userFields = {
      avatar,
    };

    const user = await User.findByIdAndUpdate(
      { _id: userId },
      { $set: userFields },
      { returnDocument: "after" },
    )
      .select("-password")
      .lean();

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "User not found." },
        "User not found.",
        400,
      );
    }

    return response.successResponse(res, user, "User Updated.");
  } catch (err) {
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

module.exports = {
  updateUserById,
  updateAvatarByUserId,
};
