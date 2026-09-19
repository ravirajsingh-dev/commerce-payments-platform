/**
 * Brute-force protection utility
 * Tracks failed login attempts per user/admin and blocks accounts after 5 failed attempts for 15 minutes
 */

const FailedLoginAttempt = require("../../models/FailedLoginAttempt");

// Configuration
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Check if an account is blocked due to brute-force protection
 * @param {string} identifier - User identifier (memberId for users, admin_id for admins)
 * @returns {Object} - { isBlocked: boolean, blockedUntil: Date | null, remainingAttempts: number }
 */
const checkBruteForceProtection = async (identifier) => {
  const key = String(identifier || "").trim();
  if (!key) {
    return {
      isBlocked: false,
      blockedUntil: null,
      remainingAttempts: MAX_ATTEMPTS,
    };
  }

  const attemptData = await FailedLoginAttempt.findOne({ identifier: key }).lean();
  if (!attemptData) {
    return {
      isBlocked: false,
      blockedUntil: null,
      remainingAttempts: MAX_ATTEMPTS,
    };
  }

  const now = new Date();

  // If blocked, check if block period has expired
  if (attemptData.blockedUntil && attemptData.blockedUntil > now) {
    const remainingMs = attemptData.blockedUntil.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return {
      isBlocked: true,
      blockedUntil: attemptData.blockedUntil,
      remainingAttempts: 0,
      remainingMinutes,
    };
  }

  // Block period expired, but attempts may still be recorded
  if (attemptData.blockedUntil && attemptData.blockedUntil <= now) {
    await FailedLoginAttempt.deleteOne({ identifier: key });
    return {
      isBlocked: false,
      blockedUntil: null,
      remainingAttempts: MAX_ATTEMPTS,
    };
  }

  // Not blocked yet, return remaining attempts
  return {
    isBlocked: false,
    blockedUntil: null,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - (attemptData.attempts || 0)),
  };
};

/**
 * Record a failed login attempt
 * @param {string} identifier - User identifier (memberId for users, admin_id for admins)
 */
const recordFailedAttempt = async (identifier) => {
  const key = String(identifier || "").trim();
  if (!key) return;

  const now = new Date();
  const current = await FailedLoginAttempt.findOne({ identifier: key }).lean();
  const nextAttempts = (current?.attempts || 0) + 1;
  const blockedUntil =
    nextAttempts >= MAX_ATTEMPTS ? new Date(now.getTime() + BLOCK_DURATION_MS) : null;

  await FailedLoginAttempt.updateOne(
    { identifier: key },
    {
      $set: {
        attempts: nextAttempts,
        blockedUntil,
        lastFailedAt: now,
      },
    },
    { upsert: true },
  );
};

/**
 * Reset failed attempts for a successful login
 * @param {string} identifier - User identifier (memberId for users, admin_id for admins)
 */
const resetAttempts = async (identifier) => {
  const key = String(identifier || "").trim();
  if (!key) return;
  await FailedLoginAttempt.deleteOne({ identifier: key });
};

module.exports = {
  checkBruteForceProtection,
  recordFailedAttempt,
  resetAttempts,
};
