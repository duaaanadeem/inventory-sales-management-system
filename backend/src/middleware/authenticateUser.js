const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {
  const authorization = req.get("authorization");
  const token = authorization && authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthenticated"
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(503).json({
      success: false,
      message: "Authentication is not configured"
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.id || payload.userId || payload.sub;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token"
      });
    }
    req.user = { ...payload, id: userId };
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token"
    });
  }
};

module.exports = authenticateUser;