/**
 * product.controller.js — HTTP layer only: read req, call service, send res.
 * No SQL here (that's product.service.js's job).
 */
const { asyncHandler, parsePagination } = require("../../utils/helpers");
const { sendData, sendMessage } = require("../../utils/response");
const productService = require("./product.service");

// GET /api/products?search=&category=&page=&limit=
const getProducts = asyncHandler(async (req, res) => {
  const { search, category } = req.query;
  const { page, limit } = parsePagination(req.query);

  const { products, total } = await productService.getAllProducts({
    search,
    categoryId: category,
    page,
    limit,
  });

  sendData(res, 200, products, { pagination: { total, page, limit } });
});

// GET /api/products/:id
const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  sendData(res, 200, product);
});

// POST /api/products (multipart/form-data). By this point
// upload.single("image") + validateCreateProduct already ran (see routes).
const createProduct = asyncHandler(async (req, res) => {
  const { sku, name, categoryId, price, cost, minStockLevel, openingStock } = req.body;
  const imageUrl = req.file ? `/uploads/products/${req.file.filename}` : null;

  const { warning, ...product } = await productService.createProduct({
    sku,
    name,
    categoryId: categoryId || null,
    price: Number(price),
    cost: Number(cost),
    imageUrl,
    minStockLevel: minStockLevel ? Number(minStockLevel) : 0,
    openingStock: openingStock ? Number(openingStock) : 0,
    changedBy: req.user ? req.user.id : null, // null until Auth module is merged
  });

  sendData(res, 201, product, warning ? { warning } : {});
});

// PUT /api/products/:id
const updateProduct = asyncHandler(async (req, res) => {
  const { sku, name, categoryId, price, cost, minStockLevel } = req.body;

  const updateData = {};
  if (sku !== undefined) updateData.sku = sku;
  if (name !== undefined) updateData.name = name;
  if (categoryId !== undefined) updateData.categoryId = categoryId;
  if (price !== undefined) updateData.price = Number(price);
  if (cost !== undefined) updateData.cost = Number(cost);
  if (minStockLevel !== undefined) updateData.minStockLevel = Number(minStockLevel);
  if (req.file) updateData.imageUrl = `/uploads/products/${req.file.filename}`;

  const product = await productService.updateProduct(req.params.id, updateData);

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  sendData(res, 200, product);
});

// DELETE /api/products/:id (soft delete)
const deleteProduct = asyncHandler(async (req, res) => {
  const deleted = await productService.softDeleteProduct(req.params.id);

  if (!deleted) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  sendMessage(res, 200, "Product deleted successfully");
});

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct };
