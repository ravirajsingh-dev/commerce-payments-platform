const mongoose = require("mongoose");
const { Schema } = mongoose;

const SINGLETON_KEY = "BESPOKE_APPOINTMENT";

const BespokeAppointmentSettingsSchema = new Schema(
  {
    singletonKey: {
      type: String,
      required: true,
      default: SINGLETON_KEY,
      immutable: true,
      unique: true,
      index: true,
    },
    pageTitle: {
      type: String,
      trim: true,
      default: "BOOK AN APPOINTMENT - BESPOKE SERVICES",
      maxlength: 200,
    },
    introLine: {
      type: String,
      trim: true,
      default:
        "True luxury is found in clothing that is expertly honed for the individual who wears it.",
      maxlength: 500,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 5000,
    },
    formHeading: {
      type: String,
      trim: true,
      default: "Request a private appointment now",
      maxlength: 200,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

let BespokeAppointmentSettings;

BespokeAppointmentSettingsSchema.statics.getOrCreateSettings = async () => {
  let settings = await BespokeAppointmentSettings.findOne({
    singletonKey: SINGLETON_KEY,
  }).sort({
    createdAt: 1,
  });
  if (settings) {
    await BespokeAppointmentSettings.deleteMany({ _id: { $ne: settings._id } });
    return settings;
  }
  settings = await BespokeAppointmentSettings.findOneAndUpdate(
    { singletonKey: SINGLETON_KEY },
    { $setOnInsert: { singletonKey: SINGLETON_KEY } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  return settings;
};

BespokeAppointmentSettings = mongoose.model(
  "bespoke_appointment_settings",
  BespokeAppointmentSettingsSchema,
);

module.exports = BespokeAppointmentSettings;
