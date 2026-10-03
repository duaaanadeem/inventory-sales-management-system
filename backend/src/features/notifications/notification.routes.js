const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');

const { verifyToken, requireRole } = require("../../middleware/auth");

router.use(verifyToken, requireRole(['admin', 'staff']));

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.post('/', notificationController.createNotification);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;