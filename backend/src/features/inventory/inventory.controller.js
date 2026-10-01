const inventoryService = require('./inventory.service');
const { sendSuccess, sendError } = require('../../utils/response');

const stockInManual = async (req, res) => {
    try {
        const data = {
            product_id: req.body.product_id,
            qty: parseInt(req.body.qty, 10),
            referenceId: req.body.reference_id || `manual_in_${Date.now()}`,
            changed_by: req.user.id
        };
        const result = await inventoryService.stockInManual(data);
        return sendSuccess(res, result);
    } catch (error) {
        if (error.statusCode === 200) {
            return sendSuccess(res, error.data);
        }
        return sendError(res, error.message, error.statusCode || 500);
    }
};

const deductStock = async (req, res) => {
    try {
        if (!req.body.reference_id) {
            return sendError(res, 'Invalid input: reference_id is required.');
        }
        const data = {
            product_id: req.body.product_id,
            qty: parseInt(req.body.qty, 10),
            referenceId: req.body.reference_id,
            changed_by: req.user.id
        };
        const result = await inventoryService.deductStock(data);
        return sendSuccess(res, result);
    } catch (error) {
        if (error.statusCode === 200) {
            return sendSuccess(res, error.data);
        }
        return sendError(res, error.message, error.statusCode || 500);
    }
};

const addStock = async (req, res) => {
    try {
        if (!req.body.reference_id) {
            return sendError(res, 'Invalid input: reference_id is required.');
        }
        const data = {
            product_id: req.body.product_id,
            qty: parseInt(req.body.qty, 10),
            referenceId: req.body.reference_id,
            changed_by: req.user.id
        };
        const result = await inventoryService.addStock(data);
        return sendSuccess(res, result);
    } catch (error) {
        if (error.statusCode === 200) {
            return sendSuccess(res, error.data);
        }
        return sendError(res, error.message, error.statusCode || 500);
    }
};

const damageStock = async (req, res) => {
    try {
        const data = {
            product_id: req.body.product_id,
            qty: parseInt(req.body.qty, 10),
            referenceId: req.body.reference_id || `damage_${Date.now()}`,
            changed_by: req.user.id
        };
        const result = await inventoryService.damageStock(data);
        return sendSuccess(res, result);
    } catch (error) {
        if (error.statusCode === 200) {
            return sendSuccess(res, error.data);
        }
        return sendError(res, error.message, error.statusCode || 500);
    }
};

const adjustStock = async (req, res) => {
    try {
        const data = {
            product_id: req.body.product_id,
            qty: parseInt(req.body.qty, 10),
            referenceId: req.body.reference_id || `adj_${Date.now()}`,
            changed_by: req.user.id
        };
        const result = await inventoryService.adjustStock(data);
        return sendSuccess(res, result);
    } catch (error) {
        if (error.statusCode === 200) {
            return sendSuccess(res, error.data);
        }
        return sendError(res, error.message, error.statusCode || 500);
    }
};

const getCurrentStock = async (req, res) => {
    try {
        const result = await inventoryService.getCurrentStock(req.params.productId);
        return sendSuccess(res, result);
    } catch (error) {
        return sendError(res, 'Internal Server Error', 500);
    }
};

const getSummary = async (req, res) => {
    try {
        const result = await inventoryService.getSummary();
        return sendSuccess(res, result);
    } catch (error) {
        return sendError(res, 'Internal Server Error', 500);
    }
};

const getReport = async (req, res) => {
    try {
        const result = await inventoryService.getReport(req.query);
        return sendSuccess(res, result);
    } catch (error) {
        return sendError(res, 'Internal Server Error', 500);
    }
};

const getLowStock = async (req, res) => {
    try {
        const result = await inventoryService.getLowStock();
        return sendSuccess(res, result);
    } catch (error) {
        return sendError(res, 'Internal Server Error', 500);
    }
};

module.exports = {
    stockInManual,
    deductStock,
    addStock,
    damageStock,
    adjustStock,
    getCurrentStock,
    getSummary,
    getReport,
    getLowStock
};
