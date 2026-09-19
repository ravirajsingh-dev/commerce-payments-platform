const express = require("express");
const { check, validationResult } = require("express-validator");
const {
  validatePhoneField,
  validateEmailField,
} = require("../../shared/middleware/validateRequest");
const controller = require("../bespoke-appointment/bespokeAppointmentController");

const router = express.Router();

const handleValidation = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: false,
      message: "Validation Error",
      errors: errors.array().map((e) => ({ path: e.param || e.path, msg: e.msg })),
    });
  }
  return next();
};

router.get("/", [], controller.getPublicContent);

router.post(
  "/submit",
  [
    check("name", "Name is required")
      .isString()
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 150 }),
    check("email", "Email is required").trim().notEmpty(),
    validateEmailField("email"),
    check("phone", "Phone is required").trim().notEmpty(),
    validatePhoneField("phone"),
    check("serviceOptionId", "Please select a service").notEmpty(),
    check("message").optional().isString().trim().isLength({ max: 2000 }),
    check("appointmentDate", "Appointment date is required").notEmpty(),
    check("appointmentTime", "Appointment time is required")
      .trim()
      .notEmpty()
      .matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  ],
  handleValidation,
  controller.submitAppointment,
);

module.exports = router;
