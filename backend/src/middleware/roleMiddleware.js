const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    return next(error);
  }

  if (!allowedRoles.includes(req.user.role)) {
    const error = new Error("You do not have permission for this action");
    error.statusCode = 403;
    return next(error);
  }

  next();
};

module.exports = { requireRole };
