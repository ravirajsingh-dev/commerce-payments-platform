const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const connectDB = require("../config/db");
const User = require("../models/User");
const ROOT_PASSWORD = process.env.ROOT_SEED_PASSWORD;

const run = async () => {
  try {
    if (!ROOT_PASSWORD || ROOT_PASSWORD.length < 12) {
      throw new Error(
        "ROOT_SEED_PASSWORD must be set and at least 12 characters long.",
      );
    }

    await connectDB();

    const existing = await User.findOne({ email: "admin@example.com" });
    if (existing) {
      console.log("Root already exists");
      await mongoose.connection.close();
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ROOT_PASSWORD, salt);

    const user = new User({
      name: "RAJWADA",
      phone: "9999999999",
      email: "admin@example.com",
      password: hashedPassword,
      status: 1,
      uuid: uuidv4(),
    });
    await user.save();

    console.log("Root created successfully");
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

run();
