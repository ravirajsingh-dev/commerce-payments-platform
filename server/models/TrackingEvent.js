const mongoose = require("mongoose");
const { Schema } = mongoose;
const { STATUS_VALUES } = require("../shared/constants/order");

const TrackingEventSchema = new Schema(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: "shipments",
      required: true,
    },

    orderId: {
      type: Schema.Types.ObjectId,
      ref: "orders",
      required: true,
    },

    status: {
      type: String,
      enum: STATUS_VALUES,
      required: true,
    },

    location: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    eventAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

TrackingEventSchema.index({ shipmentId: 1, eventAt: -1 });
TrackingEventSchema.index({ orderId: 1, eventAt: -1 });

const TrackingEvent = mongoose.model("tracking_events", TrackingEventSchema);

module.exports = TrackingEvent;
