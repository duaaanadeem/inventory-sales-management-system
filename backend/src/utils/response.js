// 200/201 with data, optional pagination or extra fields (e.g. warning)
const sendData = (res, statusCode, data, extra = {}) => {
  res.status(statusCode).json({ success: true, data, ...extra });
};

// For actions with no data to return (e.g. delete)
const sendMessage = (res, statusCode, message) => {
  res.status(statusCode).json({ success: true, message });
};

module.exports = { sendData, sendMessage };
