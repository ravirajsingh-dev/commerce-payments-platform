const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: true,
    },
    baseUrl: {
      type: String,
      required: true,
    },
    endPoint: {
      type: String,
    },
    method: {
      type: String,
      required: true,
    },
    authToken: {
      type: String,
    },
    appToken: {
      type: String,
    },
    accessToken: {
      type: String,
    },
    ip: {
      type: String,
      required: true,
    },
    statusCode: {
      type: Number,
    },
    level: {
      type: String,
    },
    body: {
      type: Object,
    },
    params: {
      type: Object,
    },
    response: {
      type: Object,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

const Log = mongoose.model("logs", LogSchema);

module.exports = Log;

module.exports.create = async (data) => {
  try {
    const log = new Log(data);
    await log.save();

    return log;
  } catch (err) {
    console.trace(err);
    return null;
  }
};
