const { asyncHandler } = require("../../utils/helpers");
const { sendData } = require("../../utils/response");
const { isNonEmptyString } = require("../../utils/validation");
const categoryService = require("./category.service");

// GET /api/categories -> { success: true, data: [{ id, name }] }
// This exact shape was promised to the Dashboard/Revenue-by-category teammate.
const getCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getAllCategories();
  sendData(res, 200, categories);
});

// POST /api/categories   body: { name: "Electronics" }
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
