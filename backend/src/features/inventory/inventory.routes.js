const express = require('express');
const router = express.Router();
const inventoryController = require('./inventory.controller');
const { validateStockChange } = require('./inventory.validation');

let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch (e) {
  rateLimit = () => (req, res, next) => next();
}

const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { success: false, error: 'Too many requests' }
});

const { verifyToken, requireRole } = require("../../middleware/auth");

router.use(verifyToken, requireRole(['admin', 'staff']));

router.post('/stock-in', writeLimiter, validateStockChange(false), inventoryController.stockInManual);
router.post('/deduct', writeLimiter, validateStockChange(false), inventoryController.deductStock);
router.post('/add', writeLimiter, validateStockChange(false), inventoryController.addStock);
router.post('/damage', writeLimiter, validateStockChange(false), inventoryController.damageStock);
router.post('/adjust', writeLimiter, validateStockChange(true), inventoryController.adjustStock);

router.get('/current/:productId', inventoryController.getCurrentStock);
router.get('/summary', inventoryController.getSummary);
router.get('/report', inventoryController.getReport);
router.get('/low-stock', inventoryController.getLowStock);
router.get('/', inventoryController.getAllInventory);

module.exports = router;
