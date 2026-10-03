const express = require('express');
const router = express.Router();
const activityController = require('./activity.controller');

const { verifyToken, requireRole } = require("../../middleware/auth");

router.use(verifyToken, requireRole(['admin']));

router.get('/summary', activityController.summary);
router.get('/', activityController.list);
router.post('/', activityController.create);
router.get('/:id', activityController.getOne);

module.exports = router;