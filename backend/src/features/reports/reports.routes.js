const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../middleware/auth');
const ctrl = require('./reports.controller');

// Require authentication and 'admin' or 'staff' role for all report routes.
router.use(verifyToken);
router.use(requireRole(['admin', 'staff']));

router.get('/sales', ctrl.getSales);
router.get('/products', ctrl.getProducts);
router.get('/inventory', ctrl.getInventory);
router.get('/profit', ctrl.getProfit);
router.get('/customers', ctrl.getCustomers);
router.get('/suppliers', ctrl.getSuppliers);

module.exports = router;
