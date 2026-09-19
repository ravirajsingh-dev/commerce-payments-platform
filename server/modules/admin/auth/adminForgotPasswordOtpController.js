const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const Admin = require("../../../models/Admin");
const SubAdmin = require("../../../models/SubAdmin");
const Session = require("../../../models/Session");
const ForgotPasswordOtp = require("../../../models/ForgotPasswordOtp");
const response = require("../../../config/response");
const emailService = require("../../../infra/email/index");

const OTP_EXPIRY_MINUTES = 10;
const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 3;
const MAX_RESENDS = 3;
const RESEND_COOLDOWN_SECONDS = 60;

const generateOtp = () => {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return otp;
};

const maskEmail = (email) => {
  if (!email || email.length < 3) return email;
  const [localPart, domain] = email.split("@");
  if (!domain) return email;

  let maskedLocal = "";
  if (localPart.length <= 2) {
    maskedLocal = localPart[0] + "*".repeat(localPart.length - 1);
  } else {
    maskedLocal =
      localPart[0] +
      "*".repeat(localPart.length - 2) +
      localPart[localPart.length - 1];
  }

  return `${maskedLocal}@${domain}`;
};

module.exports.verifyAdminId = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { adminId } = req.body;

    // Try Admin first
    let admin = await Admin.findOne({
      admin_id: { $regex: new RegExp("^" + adminId + "$", "i") },
    }).select("_id admin_id email name");

    let userType = "admins";

    // If not found in Admin, try SubAdmin
    if (!admin) {
      admin = await SubAdmin.findOne({
        admin_id: { $regex: new RegExp("^" + adminId + "$", "i") },
      }).select("_id admin_id email name");
      if (admin) {
        userType = "sub_admins";
        isSubAdmin = true;
      }
    }

    if (!admin) {
      return response.errorResponse(
        res,
        [{ path: "adminId", msg: "Invalid Admin ID" }],
        "Invalid Admin ID",
        404,
      );
    }

    if (!admin.email) {
      return response.errorResponse(
        res,
        [{ path: "adminId", msg: "Email is not registered for this account." }],
        "Email is not registered for this account.",
        400,
      );
    }

    const maskedEmail = maskEmail(admin.email);

    return response.successResponse(
      res,
      { maskedEmail },
      "Admin ID verified successfully.",
    );
  } catch (err) {
    console.error("Error in verifyAdminId:", err);
    return response.errorResponse(
      res,
      [{ path: "adminId", msg: "An error occurred. Please try again." }],
      "An error occurred. Please try again.",
      500,
    );
  }
};

module.exports.sendForgotPasswordOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { adminId, email } = req.body;

    if (!email) {
      return response.errorResponse(
        res,
        [{ path: "email", msg: "Email is required." }],
        "Email is required.",
        400,
      );
    }

    // Try Admin first
    let admin = await Admin.findOne({
      admin_id: { $regex: new RegExp("^" + adminId + "$", "i") },
    }).select("_id admin_id email name");

    let userType = "admins";
    let isSubAdmin = false;

    // If not found in Admin, try SubAdmin
    if (!admin) {
      admin = await SubAdmin.findOne({
        admin_id: { $regex: new RegExp("^" + adminId + "$", "i") },
      }).select("_id admin_id email name");
      if (admin) {
        userType = "sub_admins";
        isSubAdmin = true;
      }
    }

    if (!admin) {
      return response.errorResponse(
        res,
        [{ path: "adminId", msg: "Invalid Admin ID" }],
        "Invalid Admin ID",
        404,
      );
    }

    if (!admin.email) {
      return response.errorResponse(
        res,
        [{ path: "email", msg: "Email is not registered for this account." }],
        "Email is not registered for this account.",
        400,
      );
    }

    const enteredEmailLower = email.toLowerCase().trim();
    const adminEmailLower = admin.email.toLowerCase().trim();

    if (enteredEmailLower !== adminEmailLower) {
      return response.errorResponse(
        res,
        [{ path: "email", msg: "Email is not registered for this account." }],
        "Email is not registered for this account.",
        400,
      );
    }

    const emailLower = adminEmailLower;

    const otp = generateOtp();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    await ForgotPasswordOtp.deleteMany({
      userId: admin._id,
      userType: userType,
      email: emailLower,
    });

    await ForgotPasswordOtp.create({
      userId: admin._id,
      userType: userType,
      email: emailLower,
      otpHash,
      expiresAt,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      isUsed: false,
      resendCount: 0,
      maxResends: MAX_RESENDS,
      lastResendAt: new Date(),
    });

    const emailResult = await emailService.sendForgotPasswordOtpEmail({
      name: admin.name || "Admin",
      email: admin.email,
      otp: otp,
      expiryMinutes: OTP_EXPIRY_MINUTES,
    });

    if (!emailResult.success) {
      console.error("Failed to send OTP email:", emailResult.error);
      return response.errorResponse(
        res,
        [{ path: "email", msg: "Failed to send OTP. Please try again later." }],
        "Failed to send OTP.",
        500,
      );
    }

    const maskedEmail = maskEmail(admin.email);

    return response.successResponse(
      res,
      { maskedEmail },
      "OTP sent successfully to your email.",
    );
  } catch (err) {
    console.error("Error in sendForgotPasswordOtp:", err);
    return response.errorResponse(
      res,
      [{ path: "email", msg: "An error occurred. Please try again." }],
      "An error occurred. Please try again.",
      500,
    );
  }
};

module.exports.verifyForgotPasswordOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { adminId, otp } = req.body;

    // Try Admin first
    let admin = await Admin.findOne({
      admin_id: { $regex: new RegExp("^" + adminId + "$", "i") },
    }).select("_id admin_id email");

    let userType = "admins";

    // If not found in Admin, try SubAdmin
    if (!admin) {
      admin = await SubAdmin.findOne({
        admin_id: { $regex: new RegExp("^" + adminId + "$", "i") },
      }).select("_id admin_id email");
      if (admin) {
        userType = "sub_admins";
      }
    }

    if (!admin) {
      return response.errorResponse(
        res,
        [{ path: "adminId", msg: "Invalid Admin ID" }],
        "Invalid Admin ID",
        404,
      );
    }

    const emailLower = admin.email.toLowerCase().trim();

    const otpRecord = await ForgotPasswordOtp.findOne({
      userId: admin._id,
      userType: userType,
      email: emailLower,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return response.errorResponse(
        res,
        [
          {
            path: "otp",
            msg: "Invalid or expired OTP. Please request a new one.",
          },
        ],
        "Invalid or expired OTP.",
        400,
      );
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return response.errorResponse(
        res,
        [
          {
            path: "otp",
            msg: "Maximum attempts exceeded. Please request a new OTP.",
          },
        ],
        "Maximum attempts exceeded.",
        400,
      );
    }

    const validOtp = await bcrypt.compare(otp, otpRecord.otpHash);

    if (!validOtp) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      const remainingAttempts = otpRecord.maxAttempts - otpRecord.attempts;
      return response.errorResponse(
        res,
        [
          {
            path: "otp",
            msg: `Invalid OTP. ${
              remainingAttempts > 0
                ? `${remainingAttempts} attempt(s) remaining.`
                : "Maximum attempts exceeded."
            }`,
          },
        ],
        "Invalid OTP.",
        400,
      );
    }

    return response.successResponse(
      res,
      { verified: true },
      "OTP verified successfully.",
    );
  } catch (err) {
    console.error("Error in verifyForgotPasswordOtp:", err);
    return response.errorResponse(
      res,
      [{ path: "otp", msg: "An error occurred. Please try again." }],
      "An error occurred. Please try again.",
      500,
    );
  }
};

module.exports.resetPasswordWithOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { adminId, otp, password } = req.body;

    // Try Admin first
    let admin = await Admin.findOne({
      admin_id: { $regex: new RegExp("^" + adminId + "$", "i") },
    }).select("_id admin_id email password");

    let userType = "admins";
    let isSubAdmin = false;

    // If not found in Admin, try SubAdmin
    if (!admin) {
      admin = await SubAdmin.findOne({
        admin_id: { $regex: new RegExp("^" + adminId + "$", "i") },
      }).select("_id admin_id email password");
      if (admin) {
        userType = "sub_admins";
      }
    }

    if (!admin) {
      return response.errorResponse(
        res,
        [{ path: "adminId", msg: "Invalid Admin ID" }],
        "Invalid Admin ID",
        404,
      );
    }

    const emailLower = admin.email.toLowerCase().trim();

    const otpRecord = await ForgotPasswordOtp.findOne({
      userId: admin._id,
      userType: userType,
      email: emailLower,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return response.errorResponse(
        res,
        [
          {
            path: "otp",
            msg: "Invalid or expired OTP. Please request a new one.",
          },
        ],
        "Invalid or expired OTP.",
        400,
      );
    }

    const validOtp = await bcrypt.compare(otp, otpRecord.otpHash);

    if (!validOtp) {
      return response.errorResponse(
        res,
        [{ path: "otp", msg: "Invalid OTP." }],
        "Invalid OTP.",
        400,
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password based on user type
    admin.password = hashedPassword;
    admin.passwordChangedAt = new Date();
    await admin.save();

    otpRecord.isUsed = true;
    await otpRecord.save();

    await Session.deleteMany({ userID: admin._id });

    await ForgotPasswordOtp.deleteMany({
      userId: admin._id,
      userType: userType,
      email: emailLower,
      isUsed: false,
    });

    return response.successResponse(
      res,
      { msg: "Password reset successfully." },
      "Password reset successfully.",
    );
  } catch (err) {
    console.error("Error in resetPasswordWithOtp:", err);
    return response.errorResponse(
      res,
      [{ path: "password", msg: "An error occurred. Please try again." }],
      "An error occurred. Please try again.",
      500,
    );
  }
};

module.exports.resendForgotPasswordOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { adminId } = req.body;

    // Try Admin first
    let admin = await Admin.findOne({
      admin_id: { $regex: new RegExp("^" + adminId + "$", "i") },
    }).select("_id admin_id email name");

    let userType = "admins";

    // If not found in Admin, try SubAdmin
    if (!admin) {
      admin = await SubAdmin.findOne({
        admin_id: { $regex: new RegExp("^" + adminId + "$", "i") },
      }).select("_id admin_id email name");
      if (admin) {
        userType = "sub_admins";
      }
    }

    if (!admin) {
      return response.errorResponse(
        res,
        [{ path: "adminId", msg: "Invalid Admin ID" }],
        "Invalid Admin ID",
        404,
      );
    }

    if (!admin.email) {
      return response.errorResponse(
        res,
        [{ path: "adminId", msg: "Email is not registered for this account." }],
        "Email is not registered for this account.",
        400,
      );
    }

    const emailLower = admin.email.toLowerCase().trim();

    const existingOtpRecord = await ForgotPasswordOtp.findOne({
      userId: admin._id,
      userType: userType,
      email: emailLower,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!existingOtpRecord) {
      return response.errorResponse(
        res,
        [
          {
            path: "adminId",
            msg: "No active OTP found. Please start the process again.",
          },
        ],
        "No active OTP found.",
        400,
      );
    }

    if (existingOtpRecord.resendCount >= existingOtpRecord.maxResends) {
      return response.errorResponse(
        res,
        [
          {
            path: "adminId",
            msg: "Maximum resend limit reached. Please start the process again.",
          },
        ],
        "Maximum resend limit reached.",
        400,
      );
    }

    if (existingOtpRecord.lastResendAt) {
      const timeSinceLastResend =
        (new Date() - new Date(existingOtpRecord.lastResendAt)) / 1000;
      if (timeSinceLastResend < RESEND_COOLDOWN_SECONDS) {
        const remainingSeconds = Math.ceil(
          RESEND_COOLDOWN_SECONDS - timeSinceLastResend,
        );
        return response.errorResponse(
          res,
          [
            {
              path: "adminId",
              msg: `Please wait ${remainingSeconds} second(s) before resending.`,
            },
          ],
          `Please wait ${remainingSeconds} second(s) before resending.`,
          429,
        );
      }
    }

    const otp = generateOtp();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    await ForgotPasswordOtp.deleteMany({
      userId: admin._id,
      userType: userType,
      email: emailLower,
    });

    await ForgotPasswordOtp.create({
      userId: admin._id,
      userType: userType,
      email: emailLower,
      otpHash,
      expiresAt,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      isUsed: false,
      resendCount: existingOtpRecord.resendCount + 1,
      maxResends: MAX_RESENDS,
      lastResendAt: new Date(),
    });

    const emailResult = await emailService.sendForgotPasswordOtpEmail({
      name: admin.name || "Admin",
      email: admin.email,
      otp: otp,
      expiryMinutes: OTP_EXPIRY_MINUTES,
    });

    if (!emailResult.success) {
      console.error("Failed to send OTP email:", emailResult.error);
      return response.errorResponse(
        res,
        [
          {
            path: "adminId",
            msg: "Failed to send OTP. Please try again later.",
          },
        ],
        "Failed to send OTP.",
        500,
      );
    }

    const maskedEmail = maskEmail(admin.email);

    return response.successResponse(
      res,
      { maskedEmail },
      "OTP resent successfully to your email.",
    );
  } catch (err) {
    console.error("Error in resendForgotPasswordOtp:", err);
    return response.errorResponse(
      res,
      [{ path: "adminId", msg: "An error occurred. Please try again." }],
      "An error occurred. Please try again.",
      500,
    );
  }
};
