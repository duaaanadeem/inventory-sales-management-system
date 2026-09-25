/**
 * product.validation.js — catches obviously-bad requests before they hit
 * the DB, so the client gets a clean 400 instead of a raw Postgres error.
 * Does NOT replace schema v3's CHECK constraints (defense in depth).
 */
const {
  isNonEmptyString,
  isNonNegativeNumber,
  isNonNegativeInteger,
} = require("../../utils/validation");

// POST /api/products
const validateCreateProduct = (req, res, next) => {
  const { sku, name, price, cost, categoryId, minStockLevel, openingStock } = req.body;
  const errors = [];

  if (!isNonEmptyString(sku)) errors.push("sku is required and cannot be empty");
  if (!isNonEmptyString(name)) errors.push("name is required and cannot be empty");
  if (!isNonNegativeNumber(price)) errors.push("price is required and must be a number >= 0");
  if (!isNonNegativeNumber(cost)) errors.push("cost is required and must be a number >= 0");

  if (
    categoryId !== undefined && categoryId !== null && categoryId !== "" &&
    !Number.isInteger(Number(categoryId))
  ) {
    errors.push("categoryId must be a valid integer");
  }

  if (minStockLevel !== undefined && !isNonNegativeInteger(minStockLevel)) {
    errors.push("minStockLevel must be an integer >= 0");
  }

  if (openingStock !== undefined && !isNonNegativeInteger(openingStock)) {
    errors.push("openingStock must be an integer >= 0");
  }

  if (errors.length > 0) {
    const error = new Error(errors.join("; "));
    error.statusCode = 400;
    return next(error);
  }

  next();
};

// PUT /api/products/:id — all fields optional (partial update), but must
// be valid if provided; at least one field (or a new image) is required.
const validateUpdateProduct = (req, res, next) => {
  const { sku, name, price, cost, categoryId, minStockLevel } = req.body;
  const errors = [];

  const hasAnyField =
    [sku, name, price, cost, categoryId, minStockLevel].some((v) => v !== undefined) ||
    !!req.file;

  if (!hasAnyField) errors.push("At least one field (or a new image) must be provided");

  if (sku !== undefined && !isNonEmptyString(sku)) errors.push("sku cannot be empty");
  if (name !== undefined && !isNonEmptyString(name)) errors.push("name cannot be empty");
  if (price !== undefined && !isNonNegativeNumber(price)) errors.push("price must be a number >= 0");
  if (cost !== undefined && !isNonNegativeNumber(cost)) errors.push("cost must be a number >= 0");

  if (
    categoryId !== undefined && categoryId !== null && categoryId !== "" &&
    !Number.isInteger(Number(categoryId))
  ) {
    errors.push("categoryId must be a valid integer");
  }

  if (minStockLevel !== undefined && !isNonNegativeInteger(minStockLevel)) {
    errors.push("minStockLevel must be an integer >= 0");
  }

  if (errors.length > 0) {
    const error = new Error(errors.join("; "));
    error.statusCode = 400;
    return next(error);
  }

  next();
};

module.exports = { validateCreateProduct, validateUpdateProduct };
