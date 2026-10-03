const express = require("express");
const router = express.Router();
const purchaseController = require("./purchase.controller");

const { verifyToken, requireRole } = require("../../middleware/auth");

router.use(verifyToken, requireRole(['admin', 'staff']));

router.get("/", purchaseController.getAllPurchases);
router.post("/", purchaseController.createPurchase);
router.put("/:id/complete", purchaseController.completePurchase);

router.get("/:id/items", purchaseController.getPurchaseItems);

module.exports = router;
