// backend/src/customers/customer.routes.js
const express = require('express');
const ctrl = require('./customer.controller');

let rateLimit;
try { rateLimit = require('express-rate-limit'); }
catch (e) { rateLimit = () => (req, res, next) => next(); }

const router = express.Router();

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, error: 'Too many requests' },
});

const { verifyToken, requireRole } = require("../middleware/auth");

router.use(verifyToken);

router.get('/count', ctrl.count);          // total number of customers - see PR discussion
router.get('/', ctrl.list);
router.post('/', writeLimiter, ctrl.create);
router.get('/:id', ctrl.getOne);
router.get('/:id/purchases', requireRole(['admin', 'staff']), ctrl.purchases);
router.put('/:id', writeLimiter, requireRole(['admin']), ctrl.update);
router.delete('/:id', writeLimiter, requireRole(['admin']), ctrl.remove);

module.exports = router;
