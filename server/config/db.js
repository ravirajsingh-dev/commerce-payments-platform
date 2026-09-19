const mongoose = require("mongoose");
const { MONGO_URI } = require("./config");

const connectDB = async () => {
  try {
    mongoose.set("transactionAsyncLocalStorage", true);

    // Connection options for better reliability
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: "majority",
    };

    await mongoose.connect(MONGO_URI, options);
  } catch (err) {
    console.log("Unable to connect DB", err);
    console.log("Error details:", {
      name: err.name,
      message: err.message,
      code: err.code,
    });

    // If DNS error, provide helpful message
    if (err.code === "ESERVFAIL" || err.name === "MongoServerSelectionError") {
      console.log("\n⚠️  DNS Resolution Error - Troubleshooting steps:");
      console.log("1. Check if MongoDB Atlas cluster is running");
      console.log("2. Verify MONGO_URI in environment variables");
      console.log("3. Check network connectivity");
      console.log("4. Verify IP is whitelisted in MongoDB Atlas");
      console.log(
        "5. Try using direct connection string (replace +srv:// with mongodb://)",
      );
    }

    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
