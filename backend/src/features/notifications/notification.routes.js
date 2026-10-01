const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');

// TODO: replace with real auth middleware once Shahid's auth is merged (same stub as inventory.js)
const requireAuth = (req, _res, next) => {
  if (!req.user) req.user = { id: 1, role: 'admin' };
  next();
};

router.use(requireAuth);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.post('/', notificationController.createNotification);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;