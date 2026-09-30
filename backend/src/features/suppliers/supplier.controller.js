const supplierService = require("./supplier.service");

async function getAllSuppliers(req, res, next) {
  try {
    const suppliers = await supplierService.getAllSuppliers();
    res.json({ success: true, data: suppliers });
  } catch (error) {
    next(error);
  }
}

async function createSupplier(req, res, next) {
  try {
    const supplier = await supplierService.createSupplier(req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllSuppliers, createSupplier };
