const sendSuccess = (res, data = {}) => res.json({ success: true, data });

const sendError = (res, error, status = 400) =>
  res.status(status).json({ success: false, error });

const sendData = (res, statusCode, data, extra = {}) => {
  res.status(statusCode).json({ success: true, data, ...extra });
};

const sendMessage = (res, statusCode, message) => {
  res.status(statusCode).json({ success: true, message });
};

module.exports = { sendSuccess, sendError, sendData, sendMessage };