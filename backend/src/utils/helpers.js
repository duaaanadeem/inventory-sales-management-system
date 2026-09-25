/**
 * helpers.js — small generic utilities shared across features.
 */

/**
 * asyncHandler — wraps an async controller so thrown/rejected errors
 * automatically go to next(error) -> errorMiddleware.js, instead of
 * crashing the server or hanging the request.
 *
 *   exports.getProducts = asyncHandler(async (req, res) => { ... });
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * parsePagination — normalizes ?page & ?limit query params.
 * Keeps this logic in one place so every list endpoint behaves the same.
 */
const parsePagination = (query, defaultLimit = 20) => {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : defaultLimit;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

module.exports = { asyncHandler, parsePagination };
