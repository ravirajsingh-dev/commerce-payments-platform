const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const categoryService = require("./categoryService");

/**
 * GET /admin/categories/list
 * Get categories list with pagination, search, and filters
 */
const getCategoriesList = async (req, res) => {
  try {
    const result = await categoryService.getCategoriesList(req);
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
    console.error("Error fetching categories:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { category_id: categoryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return response.errorResponse(
        res,
        [{ path: "category_id", msg: "Invalid category id." }],
        "Validation Error",
        400,
      );
    }

    const category = await categoryService.getCategoryById(categoryId);
    if (!category) {
      return response.errorResponse(
        res,
        [{ msg: "Category not found." }],
        "Category not found.",
        404,
      );
    }

    return response.successResponse(res, category, "Category details");
  } catch (err) {
    console.error("Error fetching category details:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const createCategory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const {
      name,
      slug,
      status = 1,
      sortOrder = 0,
      parentCategoryId = null,
    } = req.body;

    if (
      parentCategoryId &&
      !mongoose.Types.ObjectId.isValid(parentCategoryId)
    ) {
      return response.errorResponse(
        res,
        [{ path: "parentCategoryId", msg: "Invalid parent category id." }],
        "Validation Error",
        400,
      );
    }

    const normalizedSlug = categoryService.generateSlug(slug || name);
    const slugTaken = await categoryService.isSlugTaken(normalizedSlug);
    if (slugTaken) {
      return response.errorResponse(
        res,
        [{ path: "slug", msg: "Provided slug is already in use." }],
        "Validation Error",
        400,
      );
    }

    const created = await categoryService.createCategory({
      name,
      slug,
      status,
      sortOrder,
      parentCategoryId,
    });

    return response.successResponse(
      res,
      created,
      "Category created successfully.",
    );
  } catch (err) {
    console.error("Error creating category:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const updateCategory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const { category_id: categoryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return response.errorResponse(
        res,
        [{ path: "category_id", msg: "Invalid category id." }],
        "Validation Error",
        400,
      );
    }

    const { name, slug, status, sortOrder, parentCategoryId } = req.body;

    if (
      parentCategoryId &&
      !mongoose.Types.ObjectId.isValid(parentCategoryId)
    ) {
      return response.errorResponse(
        res,
        [{ path: "parentCategoryId", msg: "Invalid parent category id." }],
        "Validation Error",
        400,
      );
    }
    if (parentCategoryId && String(parentCategoryId) === String(categoryId)) {
      return response.errorResponse(
        res,
        [
          {
            path: "parentCategoryId",
            msg: "Category cannot be its own parent.",
          },
        ],
        "Validation Error",
        400,
      );
    }

    const normalizedSlug = categoryService.generateSlug(slug || name || "");
    if (normalizedSlug) {
      const slugTaken = await categoryService.isSlugTaken(
        normalizedSlug,
        categoryId,
      );
      if (slugTaken) {
        return response.errorResponse(
          res,
          [{ path: "slug", msg: "Provided slug is already in use." }],
          "Validation Error",
          400,
        );
      }
    }

    const updated = await categoryService.updateCategory(categoryId, {
      name,
      slug,
      status,
      sortOrder,
      parentCategoryId,
    });
    if (!updated) {
      return response.errorResponse(
        res,
        [{ msg: "Category not found." }],
        "Category not found.",
        404,
      );
    }

    return response.successResponse(
      res,
      updated,
      "Category updated successfully.",
    );
  } catch (err) {
    console.error("Error updating category:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { category_id: categoryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return response.errorResponse(
        res,
        [{ path: "category_id", msg: "Invalid category id." }],
        "Validation Error",
        400,
      );
    }

    const childrenExists = await categoryService.hasChildren(categoryId);
    if (childrenExists) {
      return response.errorResponse(
        res,
        [{ msg: "Category has child categories and cannot be deleted." }],
        "Validation Error",
        400,
      );
    }

    const productsExists = await categoryService.hasProducts(categoryId);
    if (productsExists) {
      return response.errorResponse(
        res,
        [
          {
            msg: "Category is linked with one or more products. Remove product mappings before deleting this category.",
          },
        ],
        "Validation Error",
        400,
      );
    }

    const deleted = await categoryService.deleteCategory(categoryId);
    if (!deleted) {
      return response.errorResponse(
        res,
        [{ msg: "Category not found." }],
        "Category not found.",
        404,
      );
    }

    return response.successResponse(res, {}, "Category deleted successfully.");
  } catch (err) {
    console.error("Error deleting category:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  getCategoriesList,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
