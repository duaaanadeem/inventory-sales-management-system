const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  // Postgres error codes -> friendly HTTP responses
  if (err.code === "23505") {
    // unique_violation, e.g. duplicate SKU or category name
    return res.status(409).json({
      success: false,
      message: "Duplicate value: " + (err.detail || "already exists"),
    });
  }

  if (err.code === "23503") {
    // foreign_key_violation, e.g. category_id does not exist
    return res.status(400).json({
      success: false,
      message: "Invalid reference: " + (err.detail || "related record not found"),
    });
  }

  if (err.code === "23514") {
    // check_violation — schema v3 CHECK constraints as a last line of defense
    return res.status(400).json({
      success: false,
      message: "Invalid value: " + (err.detail || err.message || "constraint violated"),
    });
  }

  // Custom errors thrown in controller/service (error.statusCode set manually)
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

module.exports = errorMiddleware;
