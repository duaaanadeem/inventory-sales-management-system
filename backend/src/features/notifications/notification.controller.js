const notificationService = require('./notification.service');
const { sendSuccess, sendError } = require('../../utils/response');

const NOTIFICATION_TYPES = ['low_stock', 'new_sale', 'purchase_received', 'other'];

// Central place to turn a thrown error into the {success:false, error} envelope,
// matching the pattern already used in customers/customer.controller.js.
function handleError(res, err) {
  if (err.statusCode) return sendError(res, err.message, err.statusCode);
  console.error('notifications error:', err);
  return sendError(res, 'Internal Server Error', 500);
}

const getNotifications = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const unreadOnly =
      req.query.unread === 'true' || req.query.unreadOnly === 'true';
    return sendSuccess(
      res,
      await notificationService.listNotifications({ unreadOnly, limit, offset })
    );
  } catch (err) {
    return handleError(res, err);
  }
};

const getUnreadCount = async (_req, res) => {
  try {
    return sendSuccess(res, await notificationService.getUnreadCount());
  } catch (err) {
    return handleError(res, err);
  }
};

const markAsRead = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return sendError(res, 'Invalid input: notification id is required.', 400);
    return sendSuccess(res, { notification: await notificationService.markAsRead(id) });
  } catch (err) {
    return handleError(res, err);
  }
};

const markAllAsRead = async (_req, res) => {
  try {
    return sendSuccess(res, await notificationService.markAllAsRead());
  } catch (err) {
    return handleError(res, err);
  }
};

const createNotification = async (req, res) => {
  try {
    const { type, message, related_id } = req.body;
    if (!type || !message) {
      return sendError(res, 'Invalid input: type and message are required.', 400);
    }
    if (!NOTIFICATION_TYPES.includes(type)) {
      return sendError(res, `Invalid input: type must be one of ${NOTIFICATION_TYPES.join(', ')}.`, 400);
    }
    return sendSuccess(res, {
      notification: await notificationService.createNotification({ type, message, related_id }),
    });
  } catch (err) {
    return handleError(res, err);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
};