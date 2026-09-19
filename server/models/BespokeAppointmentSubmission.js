const mongoose = require("mongoose");
const { Schema } = mongoose;

const BespokeAppointmentSubmissionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    serviceOptionId: {
      type: Schema.Types.ObjectId,
      ref: "bespoke_appointment_options",
      required: true,
    },
    serviceLabel: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, trim: true, default: "", maxlength: 2000 },
    appointmentDate: { type: Date, required: true },
    appointmentTime: { type: String, required: true, trim: true, maxlength: 10 },
  },
  { timestamps: true },
);

BespokeAppointmentSubmissionSchema.index({ createdAt: -1 });
BespokeAppointmentSubmissionSchema.index({ email: 1 });
BespokeAppointmentSubmissionSchema.index({ serviceOptionId: 1 });

module.exports = mongoose.model(
  "bespoke_appointment_submissions",
  BespokeAppointmentSubmissionSchema,
);
