const jwt = require("jsonwebtoken");
const { JWT_REFRESH_SECRET } = require("../../config/config");

const verifyTokenSafely = (token, secret) => {
  try {
    return { decoded: jwt.verify(token, secret), error: null };
  } catch (error) {
    return { decoded: null, error };
  }
};

const resolveSessionUserId = ({ decodedAccessToken, refreshToken }) => {
  if (decodedAccessToken?.id) {
    return { userId: decodedAccessToken.id, decodedRefreshToken: null };
  }

  const { decoded: decodedRefreshToken } = verifyTokenSafely(
    refreshToken,
    JWT_REFRESH_SECRET,
  );

  return {
    userId: decodedRefreshToken?.id || null,
    decodedRefreshToken,
  };
};

const resolveLookupToken = ({ decodedAccessToken, refreshToken }) => {
  if (decodedAccessToken) return { token: decodedAccessToken, isRefresh: false };

  const { decoded, error } = verifyTokenSafely(refreshToken, JWT_REFRESH_SECRET);
  return { token: decoded, isRefresh: true, error };
};

const resolveTokenRole = ({ decodedAccessToken, refreshToken }) => {
  if (decodedAccessToken?.role !== undefined) return decodedAccessToken.role;

  const { decoded } = verifyTokenSafely(refreshToken, JWT_REFRESH_SECRET);
  return decoded?.role !== undefined ? decoded.role : null;
};

module.exports = {
  verifyTokenSafely,
  resolveSessionUserId,
  resolveLookupToken,
  resolveTokenRole,
};
