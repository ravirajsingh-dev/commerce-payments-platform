const crypto = require("crypto");
const mongoose = require("mongoose");

const GUEST_SESSION_HEADER = "x-guest-cart-session";
const GUEST_SESSION_COOKIE = "guest_cart_session";
const GUEST_SESSION_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createGuestSessionId = () => crypto.randomUUID();

const normalizeGuestSessionId = (value) => {
  const sessionId = String(value || "")
    .trim()
    .toLowerCase();
  if (!sessionId || !GUEST_SESSION_PATTERN.test(sessionId)) {
    return null;
  }
  return sessionId;
};

const ownerFromUserId = (userId) => ({
  type: "user",
  userId: String(userId),
});

const ownerFromGuestSession = (sessionId) => ({
  type: "guest",
  sessionId: normalizeGuestSessionId(sessionId),
});

/**
 * Accepts a cart owner object or a legacy userId string.
 */
const normalizeOwner = (ownerOrUserId) => {
  if (ownerOrUserId && typeof ownerOrUserId === "object" && ownerOrUserId.type) {
    if (ownerOrUserId.type === "guest") {
      return {
        type: "guest",
        sessionId: normalizeGuestSessionId(ownerOrUserId.sessionId),
      };
    }
    return ownerFromUserId(ownerOrUserId.userId);
  }
  return ownerFromUserId(ownerOrUserId);
};

const readGuestSessionFromRequest = (req) =>
  normalizeGuestSessionId(
    req.headers[GUEST_SESSION_HEADER] ||
      req.headers[GUEST_SESSION_HEADER.toLowerCase()] ||
      req.cookies?.[GUEST_SESSION_COOKIE],
  );

const tryResolveUserIdFromRequest = (req) => {
  const direct = req.user?.id || req.userObj?._id?.toString();
  if (direct) return String(direct);
  return null;
};

const resolveCartOwnerForRead = (req) => {
  const userId = tryResolveUserIdFromRequest(req);
  if (userId) {
    return { ok: true, owner: ownerFromUserId(userId), isGuest: false };
  }
  const sessionId = readGuestSessionFromRequest(req);
  if (sessionId) {
    return { ok: true, owner: ownerFromGuestSession(sessionId), isGuest: true };
  }
  return {
    ok: true,
    owner: { type: "guest", sessionId: null },
    isGuest: true,
    isEphemeralGuest: true,
  };
};

const resolveCartOwnerForWrite = (req) => {
  const userId = tryResolveUserIdFromRequest(req);
  if (userId) {
    return {
      ok: true,
      owner: ownerFromUserId(userId),
      isGuest: false,
      isNewGuestSession: false,
    };
  }

  let sessionId = readGuestSessionFromRequest(req);
  let isNewGuestSession = false;
  if (!sessionId) {
    sessionId = createGuestSessionId();
    isNewGuestSession = true;
  }

  return {
    ok: true,
    owner: ownerFromGuestSession(sessionId),
    isGuest: true,
    isNewGuestSession,
  };
};

const isValidUserOwner = (owner) =>
  owner?.type === "user" && mongoose.Types.ObjectId.isValid(owner.userId);

const isValidGuestOwner = (owner) =>
  owner?.type === "guest" && Boolean(normalizeGuestSessionId(owner.sessionId));

module.exports = {
  GUEST_SESSION_HEADER,
  GUEST_SESSION_COOKIE,
  createGuestSessionId,
  normalizeGuestSessionId,
  ownerFromUserId,
  ownerFromGuestSession,
  normalizeOwner,
  readGuestSessionFromRequest,
  tryResolveUserIdFromRequest,
  resolveCartOwnerForRead,
  resolveCartOwnerForWrite,
  isValidUserOwner,
  isValidGuestOwner,
};
