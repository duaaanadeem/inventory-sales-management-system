const { sendError } = require('../utils/response');

const requireStaff = (req, res, next) => {
    if (!req.user || !['admin', 'staff'].includes(req.user.role)) {
        return sendError(res, 'Staff access required', 403);
    }

    next();
};

module.exports = requireStaff;
