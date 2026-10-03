const express = require('express');
const router = express.Router();
const salesController = require('./sales.controller');
const { validateSale, validateSaleId } = require('./sales.validation');
const { verifyToken, requireRole } = require('../../middleware/auth');

// Declared before /:id so "products" is not captured as a sale id.
router.get('/products/search', verifyToken, requireRole(['admin', 'staff']), salesController.searchProducts);

router.post('/', verifyToken, requireRole(['admin', 'staff']), validateSale, salesController.createSale);

router.get('/', verifyToken, requireRole(['admin', 'staff']), salesController.listSales);

router.get('/:id', verifyToken, requireRole(['admin', 'staff']), validateSaleId, salesController.getSale);

router.get('/:id/invoice', verifyToken, requireRole(['admin', 'staff']), validateSaleId, salesController.getInvoice);

module.exports = router;
