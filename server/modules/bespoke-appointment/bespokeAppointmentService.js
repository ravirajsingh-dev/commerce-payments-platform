const mongoose = require("mongoose");
const BespokeAppointmentSettings = require("../../models/BespokeAppointmentSettings");
const BespokeAppointmentOption = require("../../models/BespokeAppointmentOption");
const BespokeAppointmentSubmission = require("../../models/BespokeAppointmentSubmission");

const toBool = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "1";
  return Boolean(value);
};

const toInt = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const getPublicContent = async () => {
  const [settings, options] = await Promise.all([
    BespokeAppointmentSettings.getOrCreateSettings(),
    BespokeAppointmentOption.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean(),
  ]);

  if (!settings.isActive) {
    return { settings: null, options: [] };
  }

  return {
    settings: {
      pageTitle: settings.pageTitle,
      introLine: settings.introLine,
      description: settings.description,
      formHeading: settings.formHeading,
    },
    options: options.map((o) => ({
      _id: o._id,
      label: o.label,
    })),
  };
};

const getAdminSettings = async () => {
  const settings = await BespokeAppointmentSettings.getOrCreateSettings();
  return settings;
};

const updateAdminSettings = async (payload) => {
  const settings = await BespokeAppointmentSettings.getOrCreateSettings();
  if (payload.pageTitle !== undefined) settings.pageTitle = String(payload.pageTitle || "").trim();
  if (payload.introLine !== undefined) settings.introLine = String(payload.introLine || "").trim();
  if (payload.description !== undefined) {
    settings.description = String(payload.description || "").trim();
  }
  if (payload.formHeading !== undefined) {
    settings.formHeading = String(payload.formHeading || "").trim();
  }
  if (payload.isActive !== undefined) settings.isActive = toBool(payload.isActive, true);
  await settings.save();
  return settings;
};

const listOptions = async () => {
  return BespokeAppointmentOption.find().sort({ order: 1, createdAt: 1 }).lean();
};

const getNextOptionOrder = async () => {
  const count = await BespokeAppointmentOption.countDocuments();
  return count + 1;
};

const normalizeOptionOrders = async (orderedIds) => {
  if (!orderedIds.length) return;
  await Promise.all(
    orderedIds.map((id, index) =>
      BespokeAppointmentOption.updateOne({ _id: id }, { $set: { order: index + 1 } }),
    ),
  );
};

const reorderOption = async (optionId, targetOrder, fieldUpdates = {}) => {
  const all = await BespokeAppointmentOption.find()
    .sort({ order: 1, createdAt: 1 })
    .select("_id");
  const movingId = String(optionId);
  const without = all.map((o) => String(o._id)).filter((id) => id !== movingId);
  const maxPos = without.length + 1;
  const pos = Math.min(Math.max(toInt(targetOrder, maxPos), 1), maxPos);
  without.splice(pos - 1, 0, movingId);
  await normalizeOptionOrders(without);

  const row = await BespokeAppointmentOption.findById(optionId);
  if (!row) return null;
  if (fieldUpdates.label !== undefined) row.label = String(fieldUpdates.label || "").trim();
  if (fieldUpdates.isActive !== undefined) {
    row.isActive = toBool(fieldUpdates.isActive, row.isActive);
  }
  await row.save();
  return row;
};

const createOption = async ({ label, order, isActive }) => {
  const nextOrder = await getNextOptionOrder();
  const targetOrder =
    order === undefined || order === null || order === ""
      ? nextOrder
      : toInt(order, nextOrder);

  const row = await BespokeAppointmentOption.create({
    label: String(label || "").trim(),
    order: targetOrder,
    isActive: toBool(isActive, true),
  });

  return reorderOption(row._id, targetOrder, {
    label: row.label,
    isActive: row.isActive,
  });
};

const updateOption = async (id, payload) => {
  const row = await BespokeAppointmentOption.findById(id);
  if (!row) return null;

  const fieldUpdates = {};
  if (payload.label !== undefined) fieldUpdates.label = String(payload.label || "").trim();
  if (payload.isActive !== undefined) fieldUpdates.isActive = toBool(payload.isActive, row.isActive);

  if (payload.order !== undefined && payload.order !== null && payload.order !== "") {
    return reorderOption(id, toInt(payload.order, row.order), fieldUpdates);
  }

  Object.assign(row, fieldUpdates);
  await row.save();
  return row;
};

const deleteOption = async (id) => {
  const deleted = await BespokeAppointmentOption.findByIdAndDelete(id);
  if (!deleted) return null;
  const remaining = await BespokeAppointmentOption.find()
    .sort({ order: 1, createdAt: 1 })
    .select("_id");
  await normalizeOptionOrders(remaining.map((o) => o._id));
  return deleted;
};

const listSubmissions = async () => {
  return BespokeAppointmentSubmission.find()
    .sort({ createdAt: -1 })
    .lean();
};

const getSubmissionById = async (id) => {
  return BespokeAppointmentSubmission.findById(id).lean();
};

const deleteSubmission = async (id) => {
  return BespokeAppointmentSubmission.findByIdAndDelete(id);
};

const createSubmission = async (payload) => {
  const option = await BespokeAppointmentOption.findOne({
    _id: payload.serviceOptionId,
    isActive: true,
  });
  if (!option) {
    const err = new Error("Invalid service option.");
    err.code = "INVALID_OPTION";
    throw err;
  }

  const appointmentDate = new Date(payload.appointmentDate);
  if (Number.isNaN(appointmentDate.getTime())) {
    const err = new Error("Invalid appointment date.");
    err.code = "INVALID_DATE";
    throw err;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (appointmentDate < today) {
    const err = new Error("Appointment date cannot be in the past.");
    err.code = "INVALID_DATE";
    throw err;
  }

  return BespokeAppointmentSubmission.create({
    name: String(payload.name || "").trim(),
    email: String(payload.email || "").trim().toLowerCase(),
    phone: String(payload.phone || "").trim(),
    serviceOptionId: option._id,
    serviceLabel: option.label,
    message: String(payload.message || "").trim(),
    appointmentDate,
    appointmentTime: String(payload.appointmentTime || "").trim(),
  });
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

module.exports = {
  getPublicContent,
  getAdminSettings,
  updateAdminSettings,
  listOptions,
  createOption,
  updateOption,
  deleteOption,
  listSubmissions,
  getSubmissionById,
  deleteSubmission,
  createSubmission,
  isValidObjectId,
};
