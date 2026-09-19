const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const attributeService = require("./attributeService");

const getAttributesList = async (req, res) => {
  try {
    const result = await attributeService.getAttributesList(req);
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
    console.error("Error fetching attributes:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getAttributesOverview = async (req, res) => {
  try {
    const result = await attributeService.getAttributesOverview(req);
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
    console.error("Error fetching attributes overview:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getAttributeById = async (req, res) => {
  try {
    const { attribute_id: attributeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(attributeId)) {
      return response.errorResponse(
        res,
        [{ path: "attribute_id", msg: "Invalid attribute id." }],
        "Validation Error",
        400,
      );
    }

    const attribute = await attributeService.getAttributeById(attributeId);
    if (!attribute) {
      return response.errorResponse(
        res,
        [{ msg: "Attribute not found." }],
        "Attribute not found.",
        404,
      );
    }

    return response.successResponse(res, attribute, "Attribute details");
  } catch (err) {
    console.error("Error fetching attribute details:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const createAttribute = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const {
      attributeSetId,
      name,
      code,
      inputType,
      isRequired = false,
      isFilterable = false,
      isVariant = false,
      options = [],
      isActive = true,
    } = req.body;

    const normalizedCode = attributeService.normalizeCode(code);
    const codeTaken = await attributeService.isCodeTaken(
      attributeSetId,
      normalizedCode,
    );
    if (codeTaken) {
      return response.errorResponse(
        res,
        [{ path: "code", msg: "Provided code is already in use." }],
        "Validation Error",
        400,
      );
    }

    const created = await attributeService.createAttribute({
      attributeSetId,
      name,
      code: normalizedCode,
      inputType,
      isRequired,
      isFilterable,
      isVariant,
      options,
      isActive,
    });

    return response.successResponse(
      res,
      created,
      "Attribute created successfully.",
    );
  } catch (err) {
    console.error("Error creating attribute:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const updateAttribute = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { attribute_id: attributeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(attributeId)) {
      return response.errorResponse(
        res,
        [{ path: "attribute_id", msg: "Invalid attribute id." }],
        "Validation Error",
        400,
      );
    }

    const {
      attributeSetId,
      name,
      code,
      inputType,
      isRequired,
      isFilterable,
      isVariant,
      options,
      isActive,
    } = req.body;

    if (code && attributeSetId) {
      const normalizedCode = attributeService.normalizeCode(code);
      const codeTaken = await attributeService.isCodeTaken(
        attributeSetId,
        normalizedCode,
        attributeId,
      );
      if (codeTaken) {
        return response.errorResponse(
          res,
          [{ path: "code", msg: "Provided code is already in use." }],
          "Validation Error",
          400,
        );
      }
    }

    const mutationCheck = await attributeService.validateAttributeMutationBeforeUpdate(
      attributeId,
      {
        attributeSetId,
        name,
        code,
        inputType,
        isRequired,
        isFilterable,
        isVariant,
        options,
        isActive,
      },
    );
    if (mutationCheck?.validationError) {
      return response.errorResponse(
        res,
        mutationCheck.validationError,
        "Validation Error",
        400,
      );
    }

    const updated = await attributeService.updateAttribute(attributeId, {
      attributeSetId,
      name,
      code,
      inputType,
      isRequired,
      isFilterable,
      isVariant,
      options,
      isActive,
    });
    if (!updated) {
      return response.errorResponse(
        res,
        [{ msg: "Attribute not found." }],
        "Attribute not found.",
        404,
      );
    }

    return response.successResponse(
      res,
      updated,
      "Attribute updated successfully.",
    );
  } catch (err) {
    console.error("Error updating attribute:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const deleteAttribute = async (req, res) => {
  try {
    const { attribute_id: attributeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(attributeId)) {
      return response.errorResponse(
        res,
        [{ path: "attribute_id", msg: "Invalid attribute id." }],
        "Validation Error",
        400,
      );
    }

    const usage = await attributeService.getAttributeUsage(attributeId);
    if (usage === null) {
      return response.errorResponse(
        res,
        [{ msg: "Attribute not found." }],
        "Attribute not found.",
        404,
      );
    }

    if (usage.usedInVariants) {
      return response.errorResponse(
        res,
        [
          {
            msg: "Attribute is used in one or more product variants and cannot be deleted.",
          },
        ],
        "Validation Error",
        400,
      );
    }

    if (usage.usedInProducts) {
      return response.errorResponse(
        res,
        [
          {
            msg: "Attribute is used in one or more products and cannot be deleted.",
          },
        ],
        "Validation Error",
        400,
      );
    }

    const deleted = await attributeService.deleteAttribute(attributeId);
    if (!deleted) {
      return response.errorResponse(
        res,
        [{ msg: "Attribute not found." }],
        "Attribute not found.",
        404,
      );
    }

    return response.successResponse(res, {}, "Attribute deleted successfully.");
  } catch (err) {
    console.error("Error deleting attribute:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  getAttributesList,
  getAttributesOverview,
  getAttributeById,
  createAttribute,
  updateAttribute,
  deleteAttribute,
};
