const express = require("express");
const router = express.Router();
const purchaseController = require("./purchase.controller");

router.get("/", purchaseController.getAllPurchases);
router.post("/", purchaseController.createPurchase);
router.put("/:id/complete", purchaseController.completePurchase);

module.exports = router;
