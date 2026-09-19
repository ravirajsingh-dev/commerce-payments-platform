const mongoose = require("mongoose");
const { Schema } = mongoose;
const {
  CLAIM_TYPE_VALUES,
  CLAIM_STATUS_VALUES,
} = require("../shared/constants/orderClaim");

const EvidenceFileSchema = new Schema(
  {
    url: { type: String, trim: true, required: true },
    key: { type: String, trim: true, required: true },
    label: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const OrderClaimSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "orders",
      required: true,
      index: true,
    },
    orderNo: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    type: { type: String, enum: CLAIM_TYPE_VALUES, required: true },
    status: {
      type: String,
      enum: CLAIM_STATUS_VALUES,
      default: "pending",
      index: true,
    },
    reasonCode: { type: String, trim: true, lowercase: true, required: true },
    note: { type: String, trim: true, default: "" },
    affectedLines: {
      type: [
        {
          orderItemId: {
            type: Schema.Types.ObjectId,
            ref: "order_items",
            required: true,
          },
          quantity: { type: Number, min: 1, required: true },
          note: { type: String, trim: true, default: "" },
          _id: false,
        },
      ],
      default: [],
    },
    scopeKey: { type: String, trim: true, required: true, index: true },
    images: { type: [EvidenceFileSchema], default: [] },
    courierReceipt: { type: [EvidenceFileSchema], default: [] },
    courierName: { type: String, trim: true, default: "" },
    trackingNumber: { type: String, trim: true, default: "" },
    shippedAt: { type: Date, default: null },
    decisionNote: { type: String, trim: true, default: "" },
    resolutionCode: { type: String, trim: true, lowercase: true, default: "" },
    resolutionNote: { type: String, trim: true, default: "" },
    refundAmount: { type: Number, min: 0, default: null },
    restockLines: {
      type: [
        {
          orderItemId: {
            type: Schema.Types.ObjectId,
            ref: "order_items",
            required: true,
          },
          quantity: { type: Number, min: 1, required: true },
          restockedAt: { type: Date, default: null },
          _id: false,
        },
      ],
      default: [],
    },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

OrderClaimSchema.index({ orderId: 1, status: 1 });
OrderClaimSchema.index({ status: 1, createdAt: -1 });
OrderClaimSchema.index({ orderNo: 1 });
OrderClaimSchema.index({ orderId: 1, scopeKey: 1, status: 1 });

const OrderClaim = mongoose.model("order_claims", OrderClaimSchema);

module.exports = OrderClaim;
