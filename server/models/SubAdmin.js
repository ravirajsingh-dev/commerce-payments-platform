const mongoose = require("mongoose");

const SubAdminSchema = new mongoose.Schema(
  {
    name: { type: String, maxlength: 50 },
    email: {
      type: String,
      unique: true,
      sparse: true,
      maxlength: 100,
      required: false,
      index: true,
    },
    admin_id: {
      type: String,
      unique: true,
      sparse: true,
      maxlength: 15,
      minlength: 8,
      index: true,
      required: true,
    },
    uuid: {
      type: String,
      unique: true,
      sparse: true,
      maxlength: 64,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    txn_password: {
      type: String,
      minlength: 8,
    },
    permissions: {
      type: Object,
      default: {},
    },
    status: {
      type: Number,
      default: 1, // 1 = Active, 2 = Inactive
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    last_login: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    role: {
      type: Number, // 3 = SubAdmin
      default: 3,
      immutable: true,
    },
  },
  {
    timestamps: true,
  },
);

const SubAdmin = mongoose.model("sub_admins", SubAdminSchema);

module.exports = SubAdmin;
