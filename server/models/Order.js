const mongoose = require("mongoose");
const { Schema } = mongoose;
const OrderAddressSnapshotSchema = require("./schemas/OrderAddressSnapshotSchema");
const {
  STATUS,
  STATUS_VALUES,
  ORDER_PAYMENT_STATUS,
  ORDER_PAYMENT_METHOD,
} = require("../shared/constants/order");
const {
  attachOrderAddressSnapshotValidation,
} = require("./orderAddressSnapshotHooks");

const OrderSchema = new Schema(
  {
    orderNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: STATUS_VALUES,
      default: STATUS.ORDER_PLACED.value,
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: Object.values(ORDER_PAYMENT_STATUS),
      default: ORDER_PAYMENT_STATUS.COD_PENDING,
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: Object.values(ORDER_PAYMENT_METHOD),
      default: ORDER_PAYMENT_METHOD.COD,
    },

    /** items − discount + gst + shipping */
    amounts: {
      items: { type: Number, required: true, min: 0, default: 0 },
      discount: { type: Number, required: true, min: 0, default: 0 },
      shipping: { type: Number, required: true, min: 0, default: 0 },
      gst: { type: Number, required: true, min: 0, default: 0 },
      total: { type: Number, required: true, min: 0, default: 0 },
    },

    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    addressSnapshot: {
      type: OrderAddressSnapshotSchema,
      required: true,
    },

    cancellation: {
      requestedAt: { type: Date, default: null },
      reason: { type: String, trim: true, default: "" },
      note: { type: String, trim: true, maxlength: 300, default: "" },
    },
  },
  { timestamps: true },
);

attachOrderAddressSnapshotValidation(OrderSchema);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ "amounts.total": -1 });
OrderSchema.index({ "cancellation.requestedAt": 1 });

const Order = mongoose.model("orders", OrderSchema);

module.exports = Order;
