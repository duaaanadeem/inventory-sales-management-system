const express = require('express');
const router = express.Router();
const salesController = require('./sales.controller');
const { validateSale, validateSaleId } = require('./sales.validation');
const authenticateUser = require('../../middleware/authenticateUser');
const requireStaff = require('../../middleware/requireStaff');

// Declared before /:id so "products" is not captured as a sale id.
router.get('/products/search', salesController.searchProducts);

router.post('/', authenticateUser, requireStaff, validateSale, salesController.createSale);

router.get('/', authenticateUser, salesController.listSales);

router.get('/:id', authenticateUser, validateSaleId, salesController.getSale);

router.get('/:id/invoice', authenticateUser, validateSaleId, salesController.getInvoice);

module.exports = router;
