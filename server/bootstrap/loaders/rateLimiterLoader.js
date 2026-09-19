/**
 * Rate Limiter Loader Module
 *
 * In-process rate limiting (single server instance).
 */

const getClientKey = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip =
    (typeof forwardedFor === "string" && forwardedFor.split(",")[0].trim()) ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown";
  return `${ip}:${req.originalUrl}`;
};

const createRouteLimiter = ({ windowMs, maxRequests, message }) => {
  const buckets = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = getClientKey(req);

    const current = buckets.get(key);
    if (!current || now > current.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.set("Retry-After", String(Math.max(retryAfterSeconds, 1)));
      return res.status(429).json({
        status: false,
        message,
        errors: [{ msg: "Too many requests. Please try again later." }],
      });
    }

    return next();
  };
};

/**
 * Load rate limiting middleware
 * @param {Express} app - Express application instance
 */
const loadRateLimiters = (app) => {
  // Conservative defaults for auth and sensitive operations.
  const authLimiter = createRouteLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 25,
    message: "Too many authentication requests. Please try again later.",
  });
  const adminLimiter = createRouteLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 120,
    message: "Too many admin requests. Please try again later.",
  });
  const generalApiLimiter = createRouteLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 300,
    message: "Too many requests. Please try again later.",
  });
  const walletTransferLimiter = createRouteLimiter({
    windowMs: 10 * 60 * 1000,
    maxRequests: 20,
    message: "Too many transfer attempts. Please try again later.",
  });
  const bespokeAppointmentLimiter = createRouteLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    message: "Too many appointment requests. Please try again later.",
  });

  app.use("/api/auth/users/register", authLimiter);
  app.use("/api/common/bespoke-appointment/submit", bespokeAppointmentLimiter);
  app.use("/api/auth", authLimiter);

  app.use("/api/users/wallet/transfer", (req, res, next) => {
    if (req.method === "POST") return walletTransferLimiter(req, res, next);
    return next();
  });
  app.use("/api/users/wallet/club-transfer", (req, res, next) => {
    if (req.method === "POST") return walletTransferLimiter(req, res, next);
    return next();
  });

  app.use("/api/admin", adminLimiter);
  app.use("/api/users", generalApiLimiter);
  app.use("/api/common", generalApiLimiter);

  console.log("✅ Rate limiting middleware loaded");
};

module.exports = {
  loadRateLimiters,
};
