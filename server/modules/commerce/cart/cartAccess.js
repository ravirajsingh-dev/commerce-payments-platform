const response = require("../../../config/response");
const {
  GUEST_SESSION_HEADER,
  GUEST_SESSION_COOKIE,
  resolveCartOwnerForRead,
  resolveCartOwnerForWrite,
} = require("./cartOwner");

const attachGuestSessionCookie = (res, sessionId) => {
  if (!sessionId) return;
  res.cookie(GUEST_SESSION_COOKIE, sessionId, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30,
    path: "/",
  });
};

const CartReadAccess = (req, res, next) => {
  const resolved = resolveCartOwnerForRead(req);
  if (!resolved.ok) {
    return response.errorResponse(res, {}, "Unable to resolve cart.", 400);
  }
  req.cartOwner = resolved.owner;
  req.cartIsGuest = resolved.isGuest;
  req.cartIsEphemeralGuest = Boolean(resolved.isEphemeralGuest);
  return next();
};

const CartWriteAccess = (req, res, next) => {
  const resolved = resolveCartOwnerForWrite(req);
  if (!resolved.ok) {
    return response.errorResponse(res, {}, "Unable to resolve cart.", 400);
  }
  req.cartOwner = resolved.owner;
  req.cartIsGuest = resolved.isGuest;
  req.isNewGuestSession = Boolean(resolved.isNewGuestSession);
  if (resolved.isNewGuestSession && resolved.owner?.sessionId) {
    attachGuestSessionCookie(res, resolved.owner.sessionId);
  }
  return next();
};

module.exports = {
  CartReadAccess,
  CartWriteAccess,
  GUEST_SESSION_HEADER,
  GUEST_SESSION_COOKIE,
  attachGuestSessionCookie,
};
