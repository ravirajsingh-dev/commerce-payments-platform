const UserAddress = require("../../../models/UserAddress");
const {
  validateCheckoutAddress,
  userAddressToSnapshot,
} = require("./validateCheckoutAddress");

const hasSavedAddressId = (body = {}) => {
  const id = body.userAddressId;
  return id !== undefined && id !== null && id !== "";
};

/**
 * Resolve a normalized addressSnapshot for checkout / validate-address.
 *
 * @param {Object} params
 * @param {string} [params.userId] - Required when body.userAddressId is set
 * @param {Object} params.body - Request body
 * @returns {Promise<{ valid: boolean, errors: Array, snapshot: Object|null, code?: string }>}
 */
const resolveCheckoutAddressSnapshot = async ({ userId, body }) => {
  if (hasSavedAddressId(body)) {
    if (!userId) {
      return {
        valid: false,
        errors: [
          {
            path: "userAddressId",
            msg: "Authentication required to use a saved address.",
          },
        ],
        snapshot: null,
        code: "UNAUTHORIZED",
      };
    }

    const address = await UserAddress.findOne({
      _id: body.userAddressId,
      userId,
    }).lean();

    if (!address) {
      return {
        valid: false,
        errors: [{ path: "userAddressId", msg: "Saved address not found." }],
        snapshot: null,
        code: "NOT_FOUND",
      };
    }

    return {
      valid: true,
      errors: [],
      snapshot: userAddressToSnapshot(address),
    };
  }

  return validateCheckoutAddress(body);
};

module.exports = {
  hasSavedAddressId,
  resolveCheckoutAddressSnapshot,
};
