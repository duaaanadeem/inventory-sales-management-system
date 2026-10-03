const supplierService = require("./supplier.service");
const { parsePagination } = require("../../utils/helpers");

async function getAllSuppliers(req, res, next) {
  try {
    const { search } = req.query;
    const { page, limit } = parsePagination(req.query);
    const { suppliers, pagination } = await supplierService.getAllSuppliers({ search, page, limit });
    res.json({ success: true, data: suppliers, pagination });
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

async function getSupplierSummary(req, res, next) {
  try {
    const data = await supplierService.getSupplierSummary(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllSuppliers, createSupplier, getSupplierSummary };
