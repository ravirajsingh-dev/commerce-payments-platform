const express = require("express");
const { check, validationResult } = require("express-validator");
const { AdminAuth } = require("../../../shared/middleware/auth");
const controller = require("../../bespoke-appointment/bespokeAppointmentController");

const router = express.Router();
const auth = [AdminAuth];

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

router.get("/settings", auth, controller.getAdminSettings);
router.put("/settings", auth, controller.updateAdminSettings);

router.get("/options/list", auth, controller.getOptions);
router.post(
  "/options/create",
  auth,
  [
    check("label", "Label is required").trim().notEmpty().isLength({ max: 120 }),
    check("order").optional().isInt({ min: 1 }),
    check("isActive").optional().isBoolean(),
  ],
  handleValidation,
  controller.createOption,
);
router.put(
  "/options/:id",
  auth,
  [
    check("label").optional().trim().notEmpty().isLength({ max: 120 }),
    check("order").optional().isInt({ min: 1 }),
    check("isActive").optional().isBoolean(),
  ],
  handleValidation,
  controller.updateOption,
);
router.delete("/options/:id", auth, controller.deleteOption);

router.get("/submissions/list", auth, controller.getSubmissions);
router.get("/submissions/:id", auth, controller.getSubmissionById);
router.delete("/submissions/:id", auth, controller.deleteSubmission);

module.exports = router;
