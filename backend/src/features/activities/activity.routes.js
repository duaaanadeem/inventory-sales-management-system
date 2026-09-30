const express = require('express');
const router = express.Router();
const activityController = require('./activity.controller');

// TODO: replace with real auth middleware once Shahid's auth is merged (same stub as inventory.js)
const requireAuth = (req, _res, next) => {
  if (!req.user) req.user = { id: 1, role: 'admin' };
  next();
};

router.use(requireAuth);

router.get('/summary', activityController.summary);
router.get('/', activityController.list);
router.post('/', activityController.create);
router.get('/:id', activityController.getOne);

module.exports = router;