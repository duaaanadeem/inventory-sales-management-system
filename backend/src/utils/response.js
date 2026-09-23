const sendSuccess = (res, data = {}) => res.json({ success: true, data });
const sendError = (res, error, status = 400) => res.status(status).json({ success: false, error });

module.exports = {
  sendSuccess,
  sendError
};
