const express = require("express");
const router = express.Router();
const supplierController = require("./supplier.controller");

const { verifyToken, requireRole } = require("../../middleware/auth");

router.use(verifyToken, requireRole(['admin', 'staff']));

router.get("/", supplierController.getAllSuppliers);
router.post("/", supplierController.createSupplier);
router.get("/:id/summary", supplierController.getSupplierSummary);

module.exports = router;
