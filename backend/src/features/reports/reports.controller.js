const reportsService = require('./reports.service');
const { sendSuccess, sendError } = require('../../utils/response');

async function getSales(req, res) {
    try {
        const { type = 'daily', from, to } = req.query;
        const data = await reportsService.getSalesReport(type, { from, to });
        return sendSuccess(res, data);
    } catch (error) {
        return sendError(res, error.message, error.statusCode || 400);
    }
}

async function getProducts(req, res) {
    try {
        const { from, to, limit } = req.query;
        const data = await reportsService.getProductSalesReport({ from, to, limit: limit ? parseInt(limit) : 10 });
        return sendSuccess(res, data);
    } catch (error) {
        return sendError(res, error.message, error.statusCode || 400);
    }
}

async function getInventory(req, res) {
    try {
        const { productId } = req.query;
        const data = await reportsService.getInventoryReport({ productId: productId ? parseInt(productId) : undefined });
        return sendSuccess(res, data);
    } catch (error) {
        return sendError(res, error.message, error.statusCode || 400);
    }
}

async function getProfit(req, res) {
    try {
        const { from, to } = req.query;
        const data = await reportsService.getProfitReport({ from, to });
        return sendSuccess(res, data);
    } catch (error) {
        return sendError(res, error.message, error.statusCode || 400);
    }
}

async function getCustomers(req, res) {
    try {
        const { from, to, limit } = req.query;
        const data = await reportsService.getCustomerReport({ from, to, limit: limit ? parseInt(limit) : 10 });
        return sendSuccess(res, data);
    } catch (error) {
        return sendError(res, error.message, error.statusCode || 400);
    }
}

async function getSuppliers(req, res) {
    try {
        const { from, to } = req.query;
        const data = await reportsService.getSupplierReport({ from, to });
        return sendSuccess(res, data);
    } catch (error) {
        return sendError(res, error.message, error.statusCode || 400);
    }
}

module.exports = {
    getSales,
    getProducts,
    getInventory,
    getProfit,
    getCustomers,
    getSuppliers
};
