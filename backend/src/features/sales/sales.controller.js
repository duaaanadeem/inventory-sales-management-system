const salesService = require('./sales.service');
const { sendSuccess, sendError } = require('../../utils/response');

const searchProducts = async (req, res) => {
    try {
        const products = await salesService.searchProducts(req.query.q);
        return sendSuccess(res, products);
    } catch (error) {
        console.error('searchProducts error:', error);
        return sendError(res, 'Internal Server Error', 500);
    }
};

const createSale = async (req, res) => {
    try {
        const result = await salesService.completeSale({
            customerId: req.body.customerId,
            paymentMethod: req.body.paymentMethod,
            items: req.body.items,
            discount: req.body.discount || 0,
            staffId: req.user.id
        });
        return sendSuccess(res, result);
    } catch (error) {
        if (error.statusCode && error.statusCode < 500) {
            return sendError(res, error.message, error.statusCode);
        }
        console.error('completeSale error:', error);
        return sendError(res, 'Internal Server Error', 500);
    }
};

const listSales = async (req, res) => {
    try {
        const sales = await salesService.listSales();
        return sendSuccess(res, sales);
    } catch (error) {
        console.error('listSales error:', error);
        return sendError(res, 'Internal Server Error', 500);
    }
};

const getSale = async (req, res) => {
    try {
        const sale = await salesService.getSale(Number(req.params.id));
        return sendSuccess(res, sale);
    } catch (error) {
        if (error.statusCode && error.statusCode < 500) {
            return sendError(res, error.message, error.statusCode);
        }
        console.error('getSale error:', error);
        return sendError(res, 'Internal Server Error', 500);
    }
};

const getInvoice = async (req, res) => {
    try {
        const invoice = await salesService.getInvoice(Number(req.params.id));
        return sendSuccess(res, invoice);
    } catch (error) {
        if (error.statusCode && error.statusCode < 500) {
            return sendError(res, error.message, error.statusCode);
        }
        console.error('getInvoice error:', error);
        return sendError(res, 'Internal Server Error', 500);
    }
};

module.exports = {
    searchProducts,
    createSale,
    listSales,
    getSale,
    getInvoice
};
