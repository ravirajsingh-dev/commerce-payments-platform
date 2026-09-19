const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const User = require("../../../models/User");
const response = require("../../../config/response");
const {
  sanitizeDuplicateKeyError,
  formatMongooseValidationErrors,
} = require("../../../shared/utils/errorSanitizer");

const register = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !email || !password) {
      return response.errorResponse(
        res,
        [{ msg: "Name, phone, email, and password are required." }],
        "Validation Error",
        400,
      );
    }

    const phoneStr = String(phone).trim();
    if (phoneStr.length !== 10) {
      return response.errorResponse(
        res,
        [{ path: "phone", msg: "Phone number must be 10 digits." }],
        "Validation Error",
        400,
      );
    }

    const emailNorm = String(email).trim().toLowerCase();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const uuid = uuidv4();

    const user = await User.create({
      name: String(name).trim(),
      phone: phoneStr,
      email: emailNorm,
      password: hashedPassword,
      status: 4,
      uuid,
    });

    const sanitizedUser = user.toObject();
    delete sanitizedUser.password;

    return response.successResponse(
      res,
      {
        user: sanitizedUser,
      },
      "Registration successful",
    );
  } catch (err) {
    console.error("Registration error:", err);

    if (err.name === "ValidationError" && err.errors) {
      const errors = formatMongooseValidationErrors(err);
      const message = errors[0]?.msg || "Please check your input";
      return response.errorResponse(res, errors, message, 400);
    }

    if (err.code === 11000) {
      const sanitizedError = sanitizeDuplicateKeyError(err, "phone");
      return response.errorResponse(
        res,
        [sanitizedError],
        "Duplicate field error",
        400,
      );
    }

    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  register,
};
