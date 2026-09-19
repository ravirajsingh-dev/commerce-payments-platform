const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { MONGO_URI } = require("../config/config");

const Admin = require("../models/Admin");

const loadAdmin = () => {
  return new Promise(async () => {
    mongoose.connect(MONGO_URI);

    const adminData = {
      name: "THE RAJWADA STORE",
      email: "admin@example.com",
      phone: "9999999999",
      admin_id: "ADMIN0001",
      uuid: randomUUID(),
      status: 1,
    };

    const password = "ChangeMe@123";
    if (!password || password.length < 8) {
      throw new Error(
        "ADMIN_SEED_PASSWORD must be set and at least 8 characters long.",
      );
    }

    const salt = await bcrypt.genSalt(10);
    adminData.password = await bcrypt.hash(password, salt);

    adminData.txn_password = await bcrypt.hash(password, salt);

    const admin = new Admin(adminData);

    await admin.save();

    process.exit(1);
  });
};

loadAdmin();
