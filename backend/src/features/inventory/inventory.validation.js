const { sendError } = require('../../utils/response');

const validateStockChange = (allowNegative = false) => {
    return (req, res, next) => {
        const { product_id, qty: qtyRaw } = req.body;
        const qty = parseInt(qtyRaw, 10);

        if (!product_id || isNaN(qty)) {
            return sendError(res, 'Invalid input: product_id and a valid integer qty are required.');
        }

        if (!allowNegative && qty <= 0) {
            return sendError(res, 'Invalid input: qty must be positive.', 400);
        }

        // reference_id will be required and checked in the controller where applicable.
        next();
    };
};

module.exports = {
    validateStockChange
};
