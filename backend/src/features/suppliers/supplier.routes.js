const express = require("express");
const router = express.Router();
const supplierController = require("./supplier.controller");

router.get("/", supplierController.getAllSuppliers);
router.post("/", supplierController.createSupplier);

module.exports = router;
