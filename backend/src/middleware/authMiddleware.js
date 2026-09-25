/**
 * authMiddleware.js — verifies the JWT sent in the "Authorization" header
 * and attaches the decoded user to req.user.
 *
 * STATUS: NOT yet applied to Products/Categories routes.
 * Confirmed with Ali: GET /api/products and GET /api/products/:id are
 * read-only, no auth required for now. This file exists so the Auth
 * teammate's module can plug in later, and so other routes can import it
 * as soon as write-protection (Admin-only create/edit/delete) is agreed.
 */
const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const error = new Error("No token provided");
    error.statusCode = 401;
    return next(error);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // expected shape: { id, role }
    next();
  } catch (err) {
    const error = new Error("Invalid or expired token");
    error.statusCode = 401;
    next(error);
  }
};

module.exports = { verifyToken };
