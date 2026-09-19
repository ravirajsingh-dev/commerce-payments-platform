const mongoose = require("mongoose");
const { Schema } = mongoose;
const { STATUS_VALUES } = require("../shared/constants/order");
const { FULFILLMENT_MODE_VALUES } = require("../shared/constants/carrier");

const ShipmentSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "orders",
      required: true,
    },

    orderNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    carrierId: {
      type: Schema.Types.ObjectId,
      ref: "carriers",
      required: true,
    },

    carrierName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    fulfillmentMode: {
      type: String,
      enum: FULFILLMENT_MODE_VALUES,
      default: null,
    },

    trackingNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    estimatedDeliveryDate: {
      type: Date,
      default: null,
    },

    currentStatus: {
      type: String,
      enum: STATUS_VALUES,
      default: null,
    },

    latestEventId: {
      type: Schema.Types.ObjectId,
      ref: "tracking_events",
      default: null,
    },

    latestStepMessage: {
      type: String,
      trim: true,
      default: null,
    },

    latestStepLocation: {
      type: String,
      trim: true,
      default: null,
    },

    latestStepAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

ShipmentSchema.index({ orderId: 1 }, { unique: true });
ShipmentSchema.index({ orderNo: 1 });

const Shipment = mongoose.model("shipments", ShipmentSchema);

module.exports = Shipment;
