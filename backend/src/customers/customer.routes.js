// backend/src/customers/customer.routes.js
const express = require('express');
const ctrl = require('./customer.controller');
const authenticateUser = require('../middleware/authenticateUser');
const requireStaff = require('../middleware/requireStaff');

let rateLimit;
try { rateLimit = require('express-rate-limit'); }
catch (e) { rateLimit = () => (req, res, next) => next(); }

const router = express.Router();

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, error: 'Too many requests' },
});

// NOTE: requireStaff only checks role is 'admin' or 'staff' - it can't tell
// them apart. Edit/remove/purchase history are meant to be admin-only (per
// the task allocation doc), but there's no requireRole('admin') wired to the
// real auth yet. Using requireStaff for now so the routes aren't open to
// everyone; swap in an admin-only check once the team settles on one -
// there's also an unused requireRole in middleware/roleMiddleware.js paired
// with a different, unused verifyToken in middleware/authMiddleware.js that
// may be meant for this.
router.use(authenticateUser);

router.get('/count', ctrl.count);
router.get('/', ctrl.list);
router.post('/', writeLimiter, ctrl.create);
router.get('/:id', ctrl.getOne);
router.get('/:id/purchases', requireStaff, ctrl.purchases);
router.put('/:id', writeLimiter, requireStaff, ctrl.update);
router.delete('/:id', writeLimiter, requireStaff, ctrl.remove);

module.exports = router;
