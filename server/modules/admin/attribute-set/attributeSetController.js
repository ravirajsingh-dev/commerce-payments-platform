const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const attributeSetService = require("./attributeSetService");

const getAttributeSetsList = async (req, res) => {
  try {
    const result = await attributeSetService.getAttributeSetsList(req);
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
    console.error("Error fetching attribute sets:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getAttributeSetById = async (req, res) => {
  try {
    const { attribute_set_id: attributeSetId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(attributeSetId)) {
      return response.errorResponse(
        res,
        [{ path: "attribute_set_id", msg: "Invalid attribute set id." }],
        "Validation Error",
        400,
      );
    }

    const attributeSet = await attributeSetService.getAttributeSetById(
      attributeSetId,
    );
    if (!attributeSet) {
      return response.errorResponse(
        res,
        [{ msg: "Attribute set not found." }],
        "Attribute set not found.",
        404,
      );
    }

    return response.successResponse(res, attributeSet, "Attribute set details");
  } catch (err) {
    console.error("Error fetching attribute set details:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const createAttributeSet = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { name, code, isActive = true } = req.body;
    const normalizedCode = attributeSetService.normalizeCode(code || name);
    const codeTaken = await attributeSetService.isCodeTaken(normalizedCode);
    if (codeTaken) {
      return response.errorResponse(
        res,
        [{ path: "code", msg: "Provided code is already in use." }],
        "Validation Error",
        400,
      );
    }

    const created = await attributeSetService.createAttributeSet({
      name,
      code,
      isActive,
    });

    return response.successResponse(
      res,
      created,
      "Attribute set created successfully.",
    );
  } catch (err) {
    console.error("Error creating attribute set:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const updateAttributeSet = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { attribute_set_id: attributeSetId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(attributeSetId)) {
      return response.errorResponse(
        res,
        [{ path: "attribute_set_id", msg: "Invalid attribute set id." }],
        "Validation Error",
        400,
      );
    }

    const { name, code, isActive } = req.body;
    const normalizedCode = attributeSetService.normalizeCode(code || name || "");
    if (normalizedCode) {
      const codeTaken = await attributeSetService.isCodeTaken(
        normalizedCode,
        attributeSetId,
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

    const updated = await attributeSetService.updateAttributeSet(attributeSetId, {
      name,
      code,
      isActive,
    });
    if (!updated) {
      return response.errorResponse(
        res,
        [{ msg: "Attribute set not found." }],
        "Attribute set not found.",
        404,
      );
    }

    return response.successResponse(
      res,
      updated,
      "Attribute set updated successfully.",
    );
  } catch (err) {
    console.error("Error updating attribute set:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const deleteAttributeSet = async (req, res) => {
  try {
    const { attribute_set_id: attributeSetId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(attributeSetId)) {
      return response.errorResponse(
        res,
        [{ path: "attribute_set_id", msg: "Invalid attribute set id." }],
        "Validation Error",
        400,
      );
    }

    const attributesExist = await attributeSetService.hasAttributes(attributeSetId);
    if (attributesExist) {
      return response.errorResponse(
        res,
        [
          {
            msg: "Attribute set has one or more attributes. Delete attributes before deleting this attribute set.",
          },
        ],
        "Validation Error",
        400,
      );
    }

    const productsExist = await attributeSetService.hasProducts(attributeSetId);
    if (productsExist) {
      return response.errorResponse(
        res,
        [
          {
            msg: "Attribute set is linked with one or more products. Remove or reassign products before deleting this attribute set.",
          },
        ],
        "Validation Error",
        400,
      );
    }

    const deleted = await attributeSetService.deleteAttributeSet(attributeSetId);
    if (!deleted) {
      return response.errorResponse(
        res,
        [{ msg: "Attribute set not found." }],
        "Attribute set not found.",
        404,
      );
    }

    return response.successResponse(res, {}, "Attribute set deleted successfully.");
  } catch (err) {
    console.error("Error deleting attribute set:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  getAttributeSetsList,
  getAttributeSetById,
  createAttributeSet,
  updateAttributeSet,
  deleteAttributeSet,
};
