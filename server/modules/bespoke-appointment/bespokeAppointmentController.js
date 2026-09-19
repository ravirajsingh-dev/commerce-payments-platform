const response = require("../../config/response");
const service = require("./bespokeAppointmentService");

const getPublicContent = async (_req, res) => {
  try {
    const data = await service.getPublicContent();
    return response.successResponse(res, data, "Bespoke appointment content fetched.");
  } catch (err) {
    console.error("getPublicBespokeAppointment:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const submitAppointment = async (req, res) => {
  try {
    const row = await service.createSubmission(req.body);
    return response.successResponse(
      res,
      { _id: row._id },
      "Your appointment request has been submitted successfully.",
      201,
    );
  } catch (err) {
    if (err.code === "INVALID_OPTION" || err.code === "INVALID_DATE") {
      return response.errorResponse(
        res,
        [{ path: err.code === "INVALID_OPTION" ? "serviceOptionId" : "appointmentDate", msg: err.message }],
        "Validation Error",
        400,
      );
    }
    console.error("submitBespokeAppointment:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getAdminSettings = async (_req, res) => {
  try {
    const settings = await service.getAdminSettings();
    return response.successResponse(res, settings, "Settings fetched.");
  } catch (err) {
    console.error("getAdminBespokeSettings:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const updateAdminSettings = async (req, res) => {
  try {
    const settings = await service.updateAdminSettings(req.body);
    return response.successResponse(res, settings, "Settings updated.");
  } catch (err) {
    console.error("updateAdminBespokeSettings:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getOptions = async (_req, res) => {
  try {
    const rows = await service.listOptions();
    return response.successResponse(res, rows, "Service options fetched.");
  } catch (err) {
    console.error("getBespokeOptions:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const createOption = async (req, res) => {
  try {
    const row = await service.createOption(req.body);
    return response.successResponse(res, row, "Service option created.", 201);
  } catch (err) {
    console.error("createBespokeOption:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const updateOption = async (req, res) => {
  try {
    if (!service.isValidObjectId(req.params.id)) {
      return response.errorResponse(
        res,
        [{ path: "id", msg: "Invalid option id." }],
        "Validation Error",
        400,
      );
    }
    const row = await service.updateOption(req.params.id, req.body);
    if (!row) {
      return response.errorResponse(res, [{ path: "id", msg: "Option not found." }], "Not found", 404);
    }
    return response.successResponse(res, row, "Service option updated.");
  } catch (err) {
    console.error("updateBespokeOption:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const deleteOption = async (req, res) => {
  try {
    if (!service.isValidObjectId(req.params.id)) {
      return response.errorResponse(
        res,
        [{ path: "id", msg: "Invalid option id." }],
        "Validation Error",
        400,
      );
    }
    const row = await service.deleteOption(req.params.id);
    if (!row) {
      return response.errorResponse(res, [{ path: "id", msg: "Option not found." }], "Not found", 404);
    }
    return response.successResponse(res, {}, "Service option deleted.");
  } catch (err) {
    console.error("deleteBespokeOption:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getSubmissions = async (_req, res) => {
  try {
    const rows = await service.listSubmissions();
    return response.successResponse(res, rows, "Appointments fetched.");
  } catch (err) {
    console.error("getBespokeSubmissions:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getSubmissionById = async (req, res) => {
  try {
    if (!service.isValidObjectId(req.params.id)) {
      return response.errorResponse(
        res,
        [{ path: "id", msg: "Invalid submission id." }],
        "Validation Error",
        400,
      );
    }
    const row = await service.getSubmissionById(req.params.id);
    if (!row) {
      return response.errorResponse(res, [{ path: "id", msg: "Submission not found." }], "Not found", 404);
    }
    return response.successResponse(res, row, "Appointment details fetched.");
  } catch (err) {
    console.error("getBespokeSubmissionById:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const deleteSubmission = async (req, res) => {
  try {
    if (!service.isValidObjectId(req.params.id)) {
      return response.errorResponse(
        res,
        [{ path: "id", msg: "Invalid submission id." }],
        "Validation Error",
        400,
      );
    }
    const row = await service.deleteSubmission(req.params.id);
    if (!row) {
      return response.errorResponse(res, [{ path: "id", msg: "Submission not found." }], "Not found", 404);
    }
    return response.successResponse(res, {}, "Appointment deleted.");
  } catch (err) {
    console.error("deleteBespokeSubmission:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  getPublicContent,
  submitAppointment,
  getAdminSettings,
  updateAdminSettings,
  getOptions,
  createOption,
  updateOption,
  deleteOption,
  getSubmissions,
  getSubmissionById,
  deleteSubmission,
};
