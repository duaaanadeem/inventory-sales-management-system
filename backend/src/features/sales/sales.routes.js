const express = require('express');
const router = express.Router();
const salesController = require('./sales.controller');
const { validateSale, validateSaleId } = require('./sales.validation');
const { verifyToken } = require('../../middleware/auth');
const requireStaff = require('../../middleware/requireStaff');

// Declared before /:id so "products" is not captured as a sale id.
// Product search is public — no auth needed to load the POS grid.
router.get('/products/search', salesController.searchProducts);

router.post('/', verifyToken, requireStaff, validateSale, salesController.createSale);

router.get('/', verifyToken, salesController.listSales);

router.get('/:id', verifyToken, validateSaleId, salesController.getSale);

router.get('/:id/invoice', verifyToken, validateSaleId, salesController.getInvoice);

module.exports = router;
