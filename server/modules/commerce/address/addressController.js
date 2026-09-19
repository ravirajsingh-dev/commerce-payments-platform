const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const {
  formatMongooseValidationErrors,
  sanitizeDuplicateKeyError,
} = require("../../../shared/utils/errorSanitizer");
const service = require("./addressService");

const resolveUserId = (req) => req.user?.id || req.userObj?._id?.toString();

const handleMongooseError = (res, err) => {
  if (err.name === "ValidationError" && err.errors) {
    const errors = formatMongooseValidationErrors(err);
    return response.errorResponse(
      res,
      errors,
      errors[0]?.msg || "Validation Error",
      400,
    );
  }

  if (err.code === 11000) {
    const sanitizedError = sanitizeDuplicateKeyError(err, "isDefault");
    return response.errorResponse(
      res,
      [sanitizedError],
      "Only one default address is allowed.",
      400,
    );
  }

  return null;
};

const listAddresses = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const addresses = await service.listAddresses(userId);
    return response.successResponse(res, { addresses }, "Addresses fetched.");
  } catch (err) {
    console.error("listAddresses:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const createAddress = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    const address = await service.createAddress(userId, req.body);
    return response.successResponse(res, { address }, "Address created.", 201);
  } catch (err) {
    const handled = handleMongooseError(res, err);
    if (handled) {
      return handled;
    }
    console.error("createAddress:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const updateAddress = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array());
  }

  try {
    const userId = resolveUserId(req);
    const { id } = req.params;

    if (!service.isValidObjectId(id)) {
      return response.errorResponse(
        res,
        [{ path: "id", msg: "Invalid address id." }],
        "Validation Error",
        400,
      );
    }

    const address = await service.updateAddress(userId, id, req.body);
    if (!address) {
      return response.errorResponse(
        res,
        [{ path: "id", msg: "Address not found." }],
        "Address not found.",
        404,
      );
    }

    return response.successResponse(res, { address }, "Address updated.");
  } catch (err) {
    const handled = handleMongooseError(res, err);
    if (handled) {
      return handled;
    }
    console.error("updateAddress:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const { id } = req.params;

    if (!service.isValidObjectId(id)) {
      return response.errorResponse(
        res,
        [{ path: "id", msg: "Invalid address id." }],
        "Validation Error",
        400,
      );
    }

    const result = await service.deleteAddress(userId, id);
    if (!result) {
      return response.errorResponse(
        res,
        [{ path: "id", msg: "Address not found." }],
        "Address not found.",
        404,
      );
    }

    return response.successResponse(res, {}, "Address deleted.");
  } catch (err) {
    console.error("deleteAddress:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const { id } = req.params;

    if (!service.isValidObjectId(id)) {
      return response.errorResponse(
        res,
        [{ path: "id", msg: "Invalid address id." }],
        "Validation Error",
        400,
      );
    }

    const address = await service.setDefaultAddress(userId, id);
    if (!address) {
      return response.errorResponse(
        res,
        [{ path: "id", msg: "Address not found." }],
        "Address not found.",
        404,
      );
    }

    return response.successResponse(res, { address }, "Default address updated.");
  } catch (err) {
    const handled = handleMongooseError(res, err);
    if (handled) {
      return handled;
    }
    console.error("setDefaultAddress:", err);
    return response.errorResponse(res, {}, "Server Error.", 500);
  }
};

module.exports = {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
