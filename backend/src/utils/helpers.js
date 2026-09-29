const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const parsePagination = (query, defaultLimit = 20) => {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : defaultLimit;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

module.exports = { asyncHandler, parsePagination };
