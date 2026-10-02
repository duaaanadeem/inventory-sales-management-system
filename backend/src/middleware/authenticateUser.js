const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');

const authenticateUser = (req, res, next) => {
    const authorization = req.get('authorization');
    const token = authorization && authorization.startsWith('Bearer ')
        ? authorization.slice(7)
        : null;

    if (!token) {
        return sendError(res, 'Unauthenticated', 401);
    }

    if (!process.env.JWT_SECRET) {
        return sendError(res, 'Authentication is not configured', 503);
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const userId = payload.id || payload.userId || payload.sub;

        if (!userId) {
            return sendError(res, 'Invalid authentication token', 401);
        }

        req.user = { ...payload, id: userId };
        return next();
    } catch (error) {
        return sendError(res, 'Invalid or expired authentication token', 401);
    }
};

module.exports = authenticateUser;
