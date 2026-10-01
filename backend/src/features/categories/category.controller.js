const { asyncHandler } = require("../../utils/helpers");
const { sendData } = require("../../utils/response");
const { isNonEmptyString } = require("../../utils/validation");
const categoryService = require("./category.service");

// GET /api/categories -> { success: true, data: [{ id, name }] }
const getCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getAllCategories();
  sendData(res, 200, categories);
});

// POST /api/categories
const addCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!isNonEmptyString(name)) {
    const error = new Error("Category name is required");
    error.statusCode = 400;
    throw error;
  }

  const category = await categoryService.createCategory(name.trim());
  sendData(res, 201, category);
});

module.exports = { getCategories, addCategory };
