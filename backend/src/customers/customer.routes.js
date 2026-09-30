// backend/src/customers/customer.routes.js
const express = require('express');
const ctrl = require('./customer.controller');

let rateLimit;
try { rateLimit = require('express-rate-limit'); }
catch (e) { rateLimit = () => (req, res, next) => next(); } // same fallback pattern as routes/inventory.js

const router = express.Router();

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, error: 'Too many requests' },
});

// TODO: replace with Shahid's real auth middleware once merged (same stub as inventory.js)
const requireAuth = (req, _res, next) => {
  if (!req.user) req.user = { id: 1, role: 'admin' };
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, error: 'You do not have permission to do this' });
  next();
};

router.use(requireAuth);

router.get('/count', ctrl.count);          // total number of customers - see PR discussion
router.get('/', ctrl.list);
router.post('/', writeLimiter, ctrl.create);
router.get('/:id', ctrl.getOne);
router.get('/:id/purchases', requireRole('admin'), ctrl.purchases);
router.put('/:id', writeLimiter, requireRole('admin'), ctrl.update);
router.delete('/:id', writeLimiter, requireRole('admin'), ctrl.remove);

module.exports = router;
