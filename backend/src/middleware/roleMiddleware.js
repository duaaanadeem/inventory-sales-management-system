/**
 * roleMiddleware.js — restricts a route to specific user_role values
 * ('admin' | 'staff', see schema enum user_role).
 *
 * Usage (once Auth module is merged):
 *   router.post("/", verifyToken, requireRole("admin"), upload.single("image"), ...);
 *
 * Per SRS: only Admin can add/edit/delete products. Currently NOT applied
 * (no auth module merged yet) — see authMiddleware.js note.
 */
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
