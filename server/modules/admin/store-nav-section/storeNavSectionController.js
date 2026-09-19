const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const storeNavSectionService = require("./storeNavSectionService");

const getStoreNavSectionsList = async (req, res) => {
  try {
    const result = await storeNavSectionService.getStoreNavSectionsList(req);
    return response.successResponse(res, result.data, result.message);
  } catch (err) {
    console.error("Error fetching store nav sections:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getStoreNavSectionById = async (req, res) => {
  try {
    const { section_id: sectionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return response.errorResponse(
        res,
        [{ path: "section_id", msg: "Invalid section id." }],
        "Validation Error",
        400,
      );
    }

    const section = await storeNavSectionService.getStoreNavSectionById(sectionId);
    if (!section) {
      return response.errorResponse(
        res,
        [{ msg: "Section not found." }],
        "Section not found.",
        404,
      );
    }

    return response.successResponse(res, section, "Section details");
  } catch (err) {
    console.error("Error fetching store nav section:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const createStoreNavSection = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { title, columnIndex, sortOrder, status, productIds } = req.body;
    const created = await storeNavSectionService.createStoreNavSection({
      title,
      columnIndex,
      sortOrder,
      status,
      productIds,
    });
    return response.successResponse(res, created, "Section created successfully.");
  } catch (err) {
    console.error("Error creating store nav section:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const updateStoreNavSection = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { section_id: sectionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return response.errorResponse(
        res,
        [{ path: "section_id", msg: "Invalid section id." }],
        "Validation Error",
        400,
      );
    }

    const { title, columnIndex, sortOrder, status, productIds } = req.body;
    const updated = await storeNavSectionService.updateStoreNavSection(sectionId, {
      title,
      columnIndex,
      sortOrder,
      status,
      productIds,
    });

    if (!updated) {
      return response.errorResponse(
        res,
        [{ msg: "Section not found." }],
        "Section not found.",
        404,
      );
    }

    return response.successResponse(res, updated, "Section updated successfully.");
  } catch (err) {
    console.error("Error updating store nav section:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const deleteStoreNavSection = async (req, res) => {
  try {
    const { section_id: sectionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return response.errorResponse(
        res,
        [{ path: "section_id", msg: "Invalid section id." }],
        "Validation Error",
        400,
      );
    }

    const deleted = await storeNavSectionService.deleteStoreNavSection(sectionId);
    if (!deleted) {
      return response.errorResponse(
        res,
        [{ msg: "Section not found." }],
        "Section not found.",
        404,
      );
    }

    return response.successResponse(res, deleted, "Section deleted successfully.");
  } catch (err) {
    console.error("Error deleting store nav section:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  getStoreNavSectionsList,
  getStoreNavSectionById,
  createStoreNavSection,
  updateStoreNavSection,
  deleteStoreNavSection,
};
