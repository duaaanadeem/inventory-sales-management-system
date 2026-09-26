const express = require("express");
const authenticateUser = require("../middleware/authenticateUser");
const requireStaff = require("../middleware/requireStaff");
const { getProducts, completeSale, listSales, getSale, getInvoice } = require("../services/salesService");

const router = express.Router();

// search products by name or SKU
router.get("/products/search", async (req, res, next) => {
  try {
    const products = await getProducts(req.query.q);
    return res.json({ success: true, data: products });
  } catch (error) {
    return next(error);
  }
});

// complete a sale
router.post("/", authenticateUser, requireStaff, async (req, res, next) => {
  try {
    const result = await completeSale({
      customerId: req.body.customerId,
      paymentMethod: req.body.paymentMethod,
      items: req.body.items,
      discount: req.body.discount || 0,
      staffId: req.user.id
    });
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.code === "23505" || error.code === "23503" || error.message.includes("INSUFFICIENT_STOCK")) {
      error.statusCode = 409;
    }
    return next(error);
  }
});

// list all sales
router.get("/", authenticateUser, async (req, res, next) => {
  try {
    const sales = await listSales();
    return res.json({ success: true, data: sales });
  } catch (error) {
    return next(error);
  }
});

// get a specific sale by ID
router.get("/:id", authenticateUser, async (req, res, next) => {
  try {
    const sale = await getSale(req.params.id);
    return res.json({ success: true, data: sale });
  } catch (error) {
    return next(error);
  }
});

// get the invoice for a specific sale by ID
router.get("/:id/invoice", authenticateUser, async (req, res, next) => {
  try {
    const invoice = await getInvoice(req.params.id);
    return res.json({ success: true, data: invoice });
  } catch (error) {
    return next(error);
  }
});


module.exports = router;
