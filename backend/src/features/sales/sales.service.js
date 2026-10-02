const crypto = require('crypto');
const pool = require('../../config/db');
const { calculateTotals } = require('./sales.calculations');
const { logActivity } = require('../activities/activity.service');
const { createNotification } = require('../notifications/notification.service');

const TAX_RATE = process.env.TAX_RATE || '0';
const PAYMENT_METHODS = ['cash', 'card', 'online'];

// Maps database and domain failures onto HTTP status codes.
// Errors that already carry a statusCode (thrown by this module) pass through.
function toHttpError(err) {
    if (err.statusCode) return err;

    const message = err.message || '';

    if (message.includes('INSUFFICIENT_STOCK')) {
        const error = new Error(message);
        error.statusCode = 409;
        return error;
    }

    if (message.includes('PRODUCT_NOT_FOUND_OR_INACTIVE')) {
        const error = new Error(message);
        error.statusCode = 404;
        return error;
    }

    // A product can exist without an inventory row, so the stock function has
    // nothing to lock. Surface it as a conflict rather than a 500.
    if (message.includes('No inventory row')) {
        const error = new Error(message);
        error.statusCode = 409;
        return error;
    }

    // 23505 = unique violation, 23503 = foreign key violation.
    if (err.code === '23505' || err.code === '23503') {
        const error = new Error(message || 'Database constraint violation');
        error.statusCode = 409;
        return error;
    }

    console.error('sales service error:', err);
    const error = new Error('Internal Server Error');
    error.statusCode = 500;
    return error;
}

function badRequest(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

// Search active products by name or SKU.
async function searchProducts(search) {
    const value = String(search || '').trim();

    const result = await pool.query(
        `SELECT p.id, p.sku, p.name, p.price, p.image_url, i.current_stock
         FROM products p
         LEFT JOIN inventory i ON i.product_id = p.id
         WHERE p.is_active = TRUE
           AND ($1 = '' OR p.name ILIKE '%' || $1 || '%' OR p.sku ILIKE '%' || $1 || '%')
         ORDER BY p.name
         LIMIT 50`,
        [value]
    );

    return result.rows;
}

// Complete a sale in a single transaction: insert the sale, its item snapshots,
// deduct stock through apply_stock_change(), and create the invoice. Any
// failure rolls the whole thing back.
async function completeSale({ customerId, paymentMethod, items, discount, staffId }) {
    if (!Array.isArray(items) || items.length === 0) {
        throw badRequest('At least one sale item is required');
    }

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
        throw badRequest('Invalid payment method');
    }

    const productIds = items.map((item) => item.productId);

    if (productIds.some((id) => !Number.isInteger(Number(id)))) {
        throw badRequest('Invalid product id');
    }

    if (new Set(productIds.map(Number)).size !== productIds.length) {
        throw badRequest('Each product may appear only once in a sale');
    }

    let client;

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Prices are read from the database, never taken from the request body.
        const productsResult = await client.query(
            `SELECT p.id, p.sku, p.name, p.price, p.category_id,
                    c.name AS category_name
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             WHERE p.is_active = TRUE AND p.id = ANY($1::int[])`,
            [productIds.map(Number)]
        );
        const products = new Map(productsResult.rows.map((product) => [product.id, product]));

        const saleItems = items.map((item) => {
            const product = products.get(Number(item.productId));
            const quantity = Number(item.quantity);

            if (!product) {
                const error = new Error(`Product ${item.productId} not found`);
                error.statusCode = 404;
                throw error;
            }

            if (!Number.isInteger(quantity) || quantity <= 0) {
                throw badRequest('Item quantities must be positive integers');
            }

            return {
                productId: product.id,
                name: product.name,
                categoryId: product.category_id,
                categoryName: product.category_name,
                quantity,
                unitPrice: product.price
            };
        });

        let totals;
        try {
            totals = calculateTotals(saleItems, discount, TAX_RATE);
        } catch (calcError) {
            throw badRequest(calcError.message);
        }

        const saleResult = await client.query(
            `INSERT INTO sales
             (customer_id, staff_id, subtotal, discount, tax, total, payment_method, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')
             RETURNING id, created_at`,
            [customerId || null, staffId, totals.subtotal, totals.discount, totals.tax, totals.total, paymentMethod]
        );
        const sale = saleResult.rows[0];

        for (const item of saleItems) {
            const lineTotal = (Math.round(Number(item.unitPrice) * 100) * item.quantity / 100).toFixed(2);

            await client.query(
                `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
                 VALUES ($1, $2, $3, $4, $5)`,
                [sale.id, item.productId, item.quantity, item.unitPrice, lineTotal]
            );

            // Single entry point for stock math. The stock_history row shares the
            // sale id as its reference, and the unique index on
            // (source, reference_id, product_id) makes a retry idempotent.
            await client.query(
                `SELECT * FROM apply_stock_change($1, $2, 'out', 'sale', $3, $4)`,
                [item.productId, item.quantity, String(sale.id), staffId]
            );
        }

        const invoiceNumber = `INV-${sale.id}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const invoiceResult = await client.query(
            `INSERT INTO invoices (sale_id, invoice_number)
             VALUES ($1, $2)
             RETURNING id, invoice_number, created_at`,
            [sale.id, invoiceNumber]
        );

        await client.query('COMMIT');

        // Fire-and-forget: log activity + notification.
        // These run after the transaction is already committed so a failure
        // here does NOT roll back the sale.
        const saleResult_ = { sale, totals, items: saleItems, invoice: invoiceResult.rows[0] };
        setImmediate(async () => {
            try {
                await logActivity({
                    userId: staffId,
                    action: `Sale #${sale.id} completed — ${saleItems.length} item(s), total $${totals.total}`,
                    entityType: 'sale',
                    entityId: sale.id,
                });
            } catch (logErr) {
                console.error('activity log error (non-fatal):', logErr.message);
            }
            try {
                await createNotification({
                    type: 'new_sale',
                    message: `New sale #${sale.id} — $${totals.total} via ${paymentMethod}`,
                    related_id: sale.id,
                });
            } catch (notifErr) {
                console.error('notification error (non-fatal):', notifErr.message);
            }
        });

        return saleResult_;
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        throw toHttpError(err);
    } finally {
        if (client) client.release();
    }
}

// Sales history with an item count and per-sale item revenue.
async function listSales() {
    const result = await pool.query(
        `SELECT s.id, s.customer_id, c.name AS customer_name, s.staff_id,
                s.subtotal, s.discount, s.tax, s.total, s.payment_method,
                s.status, s.created_at, i.invoice_number,
                COALESCE(SUM(si.quantity), 0)::int AS item_count,
                COALESCE(SUM(si.line_total), 0)::numeric(12,2) AS item_revenue
         FROM sales s
         LEFT JOIN customers c ON c.id = s.customer_id
         LEFT JOIN invoices i ON i.sale_id = s.id
         LEFT JOIN sale_items si ON si.sale_id = s.id
         GROUP BY s.id, c.name, i.invoice_number
         ORDER BY s.created_at DESC`
    );

    return result.rows;
}

// A single sale plus its item snapshots.
async function getSale(saleId) {
    const saleResult = await pool.query(
        `SELECT s.id, s.customer_id, c.name AS customer_name, s.staff_id,
                s.subtotal, s.discount, s.tax, s.total, s.payment_method,
                s.status, s.created_at, i.id AS invoice_id, i.invoice_number, i.pdf_url
         FROM sales s
         LEFT JOIN customers c ON c.id = s.customer_id
         LEFT JOIN invoices i ON i.sale_id = s.id
         WHERE s.id = $1`,
        [saleId]
    );

    if (saleResult.rowCount === 0) {
        const error = new Error('Sale not found');
        error.statusCode = 404;
        throw error;
    }

    const itemsResult = await pool.query(
        `SELECT si.id, si.product_id, p.name, p.sku, p.category_id,
                cat.name AS category_name, si.quantity,
                si.unit_price, si.line_total
         FROM sale_items si
         JOIN products p ON p.id = si.product_id
         LEFT JOIN categories cat ON cat.id = p.category_id
         WHERE si.sale_id = $1
         ORDER BY si.id`,
        [saleId]
    );

    return { ...saleResult.rows[0], items: itemsResult.rows };
}

async function getInvoice(saleId) {
    const sale = await getSale(saleId);

    return {
        invoice: {
            id: sale.invoice_id,
            invoiceNumber: sale.invoice_number,
            pdfUrl: sale.pdf_url,
            createdAt: sale.created_at
        },
        sale
    };
}

module.exports = {
    searchProducts,
    completeSale,
    listSales,
    getSale,
    getInvoice
};
