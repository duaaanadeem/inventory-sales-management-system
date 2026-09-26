const requireStaff = (req, res, next) => {
  if (!req.user || !["admin", "staff"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Staff access required"
    });
  }

  next();
};

module.exports = requireStaff;
