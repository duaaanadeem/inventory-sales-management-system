const { sendError } = require('../../utils/response');

const PAYMENT_METHODS = ['cash', 'card', 'online'];

// Validates the checkout payload before it reaches the service layer.
// The service re-validates everything it depends on, so this is a fast-fail
// convenience for the client, not the only line of defence.
const validateSale = (req, res, next) => {
    const { paymentMethod, items, discount } = req.body;

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
        return sendError(res, 'Invalid input: paymentMethod must be one of cash, card, online.', 400);
    }

    if (!Array.isArray(items) || items.length === 0) {
        return sendError(res, 'Invalid input: items must be a non-empty array.', 400);
    }

    const hasBadItem = items.some((item) => {
        if (!item || !item.productId) return true;
        const quantity = Number(item.quantity);
        return !Number.isInteger(quantity) || quantity <= 0;
    });

    if (hasBadItem) {
        return sendError(res, 'Invalid input: every item needs a productId and a positive integer quantity.', 400);
    }

    const hasDiscount = discount !== undefined && discount !== null && discount !== '';
    if (hasDiscount && (Number.isNaN(Number(discount)) || Number(discount) < 0)) {
        return sendError(res, 'Invalid input: discount must be a non-negative number.', 400);
    }

    next();
};

// Guards the :id routes so a non-numeric id returns 400 instead of a
// PostgreSQL cast error.
const validateSaleId = (req, res, next) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return sendError(res, 'Invalid input: sale id must be a positive integer.', 400);
    }

    next();
};

module.exports = {
    validateSale,
    validateSaleId
};
