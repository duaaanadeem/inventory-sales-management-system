const purchaseService = require("./purchase.service");

async function getAllPurchases(req, res, next) {
  try {
    const purchases = await purchaseService.getAllPurchases();
    res.json({ success: true, data: purchases });
  } catch (error) {
    next(error);
  }
}

async function getPurchaseItems(req, res, next) {
  try {
    const items = await purchaseService.getPurchaseItems(req.params.id);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

async function createPurchase(req, res, next) {
  try {
    const purchase = await purchaseService.createPurchase(req.body);
    res.status(201).json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
}

async function completePurchase(req, res, next) {
  try {
    // Fallback to 1 if user isn't populated (e.g. mock auth)
    const adminId = req.user ? req.user.id : 1; 
    const damagedItems = req.body.damaged_items || [];
    const purchase = await purchaseService.completePurchase(req.params.id, adminId, damagedItems);
    res.json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllPurchases, createPurchase, completePurchase, getPurchaseItems };
