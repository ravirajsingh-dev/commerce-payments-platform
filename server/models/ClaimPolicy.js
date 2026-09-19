const mongoose = require("mongoose");
const { Schema } = mongoose;
const { CLAIM_TYPE_VALUES } = require("../shared/constants/orderClaim");

const ClaimPolicySchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 60,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    eligibility: {
      claimsEnabled: { type: Boolean, default: true },
      claimWindowDays: { type: Number, min: 0, default: 7 },
      allowedClaimTypes: {
        type: [String],
        default: () => [...CLAIM_TYPE_VALUES],
      },
      allowedClaimReasons: {
        type: [String],
        default: [],
      },
    },
    evidenceRules: {
      requiredByTypeReason: {
        type: [
          {
            claimType: {
              type: String,
              enum: CLAIM_TYPE_VALUES,
              required: true,
            },
            reasonCode: {
              type: String,
              trim: true,
              lowercase: true,
              required: true,
            },
            requiredEvidence: { type: [String], default: [] },
            _id: false,
          },
        ],
        default: [],
      },
      minImages: { type: Number, min: 0, default: 0 },
      maxImages: { type: Number, min: 0, default: 10 },
      requireCourierReceipt: { type: Boolean, default: false },
      requireDamageProof: { type: Boolean, default: false },
      requireFitProof: { type: Boolean, default: false },
      requireProductProof: { type: Boolean, default: false },
    },
    restockPolicy: {
      restockableByDefault: { type: Boolean, default: false },
      requireQcForRestock: { type: Boolean, default: true },
      bespokeNonRestockableByDefault: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

ClaimPolicySchema.index({ code: 1 }, { unique: true });
ClaimPolicySchema.index({ name: 1 });

const ClaimPolicy = mongoose.model("claim_policies", ClaimPolicySchema);

module.exports = ClaimPolicy;
