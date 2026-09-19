const mongoose = require("mongoose");
const { Schema } = mongoose;

const BespokeAppointmentOptionSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 120 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

BespokeAppointmentOptionSchema.index({ isActive: 1, order: 1, createdAt: -1 });

module.exports = mongoose.model(
  "bespoke_appointment_options",
  BespokeAppointmentOptionSchema,
);
