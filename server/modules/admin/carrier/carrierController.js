const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const carrierService = require("./carrierService");

const getCarriersList = async (req, res) => {
  try {
    const result = await carrierService.getCarriersList(req);
    if (result?.validationError) {
      return response.errorResponse(
        res,
        result.validationError,
        "Validation Error",
        400,
      );
    }

    return response.successResponse(res, result.data, result.message);
  } catch (err) {
    console.error("Error fetching carriers:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getCarrierById = async (req, res) => {
  try {
    const { carrier_id: carrierId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(carrierId)) {
      return response.errorResponse(
        res,
        [{ path: "carrier_id", msg: "Invalid carrier id." }],
        "Validation Error",
        400,
      );
    }

    const carrier = await carrierService.getCarrierById(carrierId);
    if (!carrier) {
      return response.errorResponse(
        res,
        [{ msg: "Carrier not found." }],
        "Carrier not found.",
        404,
      );
    }

    return response.successResponse(res, carrier, "Carrier details");
  } catch (err) {
    console.error("Error fetching carrier details:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const createCarrier = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { name, slug, trackingUrl, fulfillmentMode, isActive = true } = req.body;
    const normalizedSlug = carrierService.normalizeSlug(slug || name);
    const slugTaken = await carrierService.isSlugTaken(normalizedSlug);
    if (slugTaken) {
      return response.errorResponse(
        res,
        [{ path: "slug", msg: "Provided slug is already in use." }],
        "Validation Error",
        400,
      );
    }

    const created = await carrierService.createCarrier({
      name,
      slug: normalizedSlug,
      trackingUrl,
      fulfillmentMode,
      isActive,
    });

    return response.successResponse(
      res,
      created,
      "Carrier created successfully.",
    );
  } catch (err) {
    console.error("Error creating carrier:", err);
    if (err?.code === 11000) {
      const dupField = Object.keys(err?.keyPattern || {})[0] || "slug";
      return response.errorResponse(
        res,
        [
          {
            path: dupField,
            msg:
              dupField === "slug"
                ? "Provided slug is already in use."
                : `Duplicate value for ${dupField}.`,
          },
        ],
        "Validation Error",
        400,
      );
    }
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const updateCarrier = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { carrier_id: carrierId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(carrierId)) {
      return response.errorResponse(
        res,
        [{ path: "carrier_id", msg: "Invalid carrier id." }],
        "Validation Error",
        400,
      );
    }

    const { name, slug, trackingUrl, fulfillmentMode, isActive } = req.body;
    const nextSlug =
      slug !== undefined
        ? carrierService.normalizeSlug(slug)
        : name !== undefined
          ? carrierService.normalizeSlug(name)
          : null;

    if (nextSlug) {
      const slugTaken = await carrierService.isSlugTaken(nextSlug, carrierId);
      if (slugTaken) {
        return response.errorResponse(
          res,
          [{ path: "slug", msg: "Provided slug is already in use." }],
          "Validation Error",
          400,
        );
      }
    }

    const updated = await carrierService.updateCarrier(carrierId, {
      name,
      slug: nextSlug || undefined,
      trackingUrl,
      fulfillmentMode,
      isActive,
    });

    if (!updated) {
      return response.errorResponse(
        res,
        [{ msg: "Carrier not found." }],
        "Carrier not found.",
        404,
      );
    }

    return response.successResponse(
      res,
      updated,
      "Carrier updated successfully.",
    );
  } catch (err) {
    console.error("Error updating carrier:", err);
    if (err?.code === 11000) {
      const dupField = Object.keys(err?.keyPattern || {})[0] || "slug";
      return response.errorResponse(
        res,
        [
          {
            path: dupField,
            msg:
              dupField === "slug"
                ? "Provided slug is already in use."
                : `Duplicate value for ${dupField}.`,
          },
        ],
        "Validation Error",
        400,
      );
    }
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const deleteCarrier = async (req, res) => {
  try {
    const { carrier_id: carrierId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(carrierId)) {
      return response.errorResponse(
        res,
        [{ path: "carrier_id", msg: "Invalid carrier id." }],
        "Validation Error",
        400,
      );
    }

    const deleted = await carrierService.deleteCarrier(carrierId);
    if (!deleted) {
      return response.errorResponse(
        res,
        [{ msg: "Carrier not found." }],
        "Carrier not found.",
        404,
      );
    }

    return response.successResponse(res, {}, "Carrier deleted successfully.");
  } catch (err) {
    console.error("Error deleting carrier:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  getCarriersList,
  getCarrierById,
  createCarrier,
  updateCarrier,
  deleteCarrier,
};
