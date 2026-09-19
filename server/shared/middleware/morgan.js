const morgan = require("morgan");
const Log = require("../../models/Log");
const { sanitizeLogBody } = require("./logSanitizer");

morgan.token("requester", (req, res) => {
  const xAuthToken = req.header("x-auth-token");
  const xAppToken = req.header("x-app-token");
  const xAccessToken = req.header("x-access-token");
  const ip = req.socket.remoteAddress;

  const originalUrl = req.originalUrl;

  let baseUrl = req.baseUrl || "";
  let path = req.url.replace(/\?.*$/, "").replace("/", "");

  let level = "WebApp";
  if (xAppToken || xAccessToken) {
    level = "Client";
  }

  const method = req.method;
  const statusCode = res.statusCode;
  const body = sanitizeLogBody(req.body);
  const params = req.params;

  let response;
  try {
    response = JSON.parse(res.responseBody);
  } catch (error) {
    response = res.responseBody;
  }

  if (level === "Client") {
    const data = {
      originalUrl,
      baseUrl,
      endPoint: path,
      method,
      authToken: xAuthToken,
      appToken: xAppToken,
      accessToken: xAccessToken,
      ip,
      statusCode,
      level,
      body,
      params,
      response,
    };
    Log.create(data).catch((err) => {
      console.error("Error saving log:", err);
    });
  }

  // Return a string representation for logging purposes
  return `${level}`;
});

const logFormat =
  ':requester :remote-addr [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms';

const morganMiddleware = morgan(logFormat);

module.exports = morganMiddleware;
