const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      maxlength: 20,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      maxlength: 50,
      required: false,
      index: true,
    },

    ccode: {
      type: String,
      minlength: 1,
      maxlength: 5,
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
      maxlength: 10,
      minlength: 10,
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
      immutable: true,
    },
    uuid: {
      type: String,
      unique: true,
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

    status: {
      type: Number,
      default: 1, // 1 = Active, 2 = Inactive
    },

    last_login: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    avatar: {
      type: String,
    },

    role: {
      type: Number, //2 = Admin
      required: true,
      default: 2,
      immutable: true,
    },
  },
  {
    timestamps: true,
  },
);

AdminSchema.pre("save", async function () {
  // Singleton guard: only one admin document is allowed.
  if (this.isNew) {
    const existingAdmin = await this.constructor.exists({
      _id: { $ne: this._id },
    });
    if (existingAdmin) {
      throw new Error("Not allowed: admin already exist");
    }
  }
});

const Admin = mongoose.model("admins", AdminSchema);

module.exports = Admin;
