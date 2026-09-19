const express = require('express');
const router = express.Router();
let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch (e) {
  // Fallback if express-rate-limit is not installed
  rateLimit = () => (req, res, next) => next();
}

// Assuming a pg.Pool is exported from db config. 
// Since project currently shows mongoose, we'll try to require a pg setup.
// If it fails, we'll provide a mock pool so the file can still be parsed.
let pool;
try {
  pool = require('../config/pg-db'); // Try specific pg config if it exists
} catch (e) {
  try {
    pool = require('../config/db'); // Try default db if it's updated to pg
  } catch (err) {
    throw new Error('Could not load DB config from ../config/pg-db or ../config/db — check the file exists and exports a pg Pool');
  }
}

const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { success: false, error: 'Too many requests' }
});

const sendSuccess = (res, data = {}) => res.json({ success: true, data });
const sendError = (res, error, status = 400) => res.status(status).json({ success: false, error });

// TODO: replace with real auth middleware once Shahid's auth is merged
const requireAuth = (req, res, next) => {
    // Stub auth
    if (!req.user) {
        req.user = { id: 1 };
    }
    next();
};

router.use(requireAuth);

async function callStockChange(req, res, changeType, source, referenceId, qtyRaw, allowNegative = false) {
    const { product_id } = req.body;
    const qty = parseInt(qtyRaw, 10);
    const changed_by = req.user.id;

    if (!product_id || isNaN(qty)) {
        return sendError(res, 'Invalid input: product_id and a valid integer qty are required.');
    }
    
    if (!allowNegative && qty <= 0) {
        return sendError(res, 'Invalid input: qty must be positive.', 400);
    }

    if (!referenceId) {
        return sendError(res, 'Invalid input: reference_id is required.');
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        
        const result = await client.query(
            'SELECT * FROM apply_stock_change($1, $2, $3, $4, $5, $6)',
            [product_id, qty, changeType, source, referenceId, changed_by]
        );
        
        await client.query('COMMIT');
        
        return sendSuccess(res, result.rows[0] || { message: 'Stock updated successfully' });
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        
        // Catch INSUFFICIENT_STOCK raised by DB
        if (err.message && err.message.includes('INSUFFICIENT_STOCK')) {
            return sendError(res, err.message, 409);
        }
        
        // Catch unique-violation on reference_id (Postgres code 23505)
        if (err.code === '23505') {
            try {
                const currentResult = await pool.query('SELECT current_stock FROM inventory WHERE product_id = $1', [product_id]);
                const new_stock = currentResult.rows.length ? currentResult.rows[0].current_stock : 0;
                return sendSuccess(res, { message: 'Already processed (idempotent via constraint)', new_stock });
            } catch (queryErr) {
                console.error('Error fetching stock for idempotent response:', queryErr);
                return sendError(res, 'Internal Server Error', 500);
            }
        }
        
        console.error('apply_stock_change error:', err);
        return sendError(res, 'Internal Server Error', 500);
    } finally {
        if (client) client.release();
    }
}

router.post('/stock-in', writeLimiter, (req, res) => {
    callStockChange(req, res, 'in', 'manual', req.body.reference_id || `manual_in_${Date.now()}`, req.body.qty, false);
});

router.post('/deduct', writeLimiter, (req, res) => {
    callStockChange(req, res, 'out', 'sale', req.body.reference_id, req.body.qty, false);
});

router.post('/add', writeLimiter, (req, res) => {
    callStockChange(req, res, 'in', 'purchase', req.body.reference_id, req.body.qty, false);
});

router.post('/damage', writeLimiter, (req, res) => {
    callStockChange(req, res, 'damaged', 'damage_report', req.body.reference_id || `damage_${Date.now()}`, req.body.qty, false);
});

router.post('/adjust', writeLimiter, (req, res) => {
    // Adjustment magnitude is positive, logic inside DB handles it based on sign if implemented,
    // but schema says `v_new := v_current + p_qty` so if adjusting down, qty should be negative.
    // Allow negative qty here because adjustment can reduce stock.
    callStockChange(req, res, 'adjustment', 'manual', req.body.reference_id || `adj_${Date.now()}`, req.body.qty, true);
});

router.get('/current/:productId', async (req, res) => {
    try {
        const result = await pool.query('SELECT current_stock, min_stock_level FROM inventory WHERE product_id = $1', [req.params.productId]);
        return sendSuccess(res, result.rows.length ? result.rows[0] : { current_stock: 0 });
    } catch (err) { 
        return sendError(res, 'Internal Server Error', 500); 
    }
});

router.get('/summary', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*)::int as total_products, 
                COALESCE(SUM(current_stock), 0)::int as total_stock_items,
                COALESCE(SUM(CASE WHEN current_stock <= min_stock_level THEN 1 ELSE 0 END), 0)::int as low_stock_count
            FROM inventory
        `);
        return sendSuccess(res, result.rows[0] || {});
    } catch (err) { 
        return sendError(res, 'Internal Server Error', 500); 
    }
});

router.get('/report', async (req, res) => {
    const { from, to, productId } = req.query;
    let query = 'SELECT * FROM stock_history WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (productId) { 
        query += ` AND product_id = $${paramCount++}`; 
        params.push(productId); 
    }
    if (from) { 
        query += ` AND created_at >= $${paramCount++}`; 
        params.push(from); 
    }
    if (to) { 
        query += ` AND created_at <= $${paramCount++}`; 
        params.push(to); 
    }
    
    query += ' ORDER BY created_at DESC LIMIT 500';
    try {
        const result = await pool.query(query, params);
        return sendSuccess(res, { history: result.rows });
    } catch (err) { 
        return sendError(res, 'Internal Server Error', 500); 
    }
});

router.get('/low-stock', async (req, res) => {
    try {
        const result = await pool.query('SELECT product_id, current_stock, min_stock_level FROM inventory WHERE current_stock <= min_stock_level');
        return sendSuccess(res, { low_stock_products: result.rows });
    } catch (err) { 
        return sendError(res, 'Internal Server Error', 500); 
    }
});

module.exports = router;
