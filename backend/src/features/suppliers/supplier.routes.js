const express = require("express");
const router = express.Router();
const supplierController = require("./supplier.controller");

router.get("/", supplierController.getAllSuppliers);
router.post("/", supplierController.createSupplier);
router.get("/:id/summary", supplierController.getSupplierSummary);

module.exports = router;
