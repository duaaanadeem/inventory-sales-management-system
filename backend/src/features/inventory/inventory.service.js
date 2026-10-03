const pool = require('../../config/pg-db');

async function applyStockChangeService({ product_id, qty, changeType, source, referenceId, changed_by }) {
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        
        const result = await client.query(
            'SELECT * FROM apply_stock_change($1, $2, $3, $4, $5, $6)',
            [product_id, qty, changeType, source, referenceId, changed_by]
        );
        
        await client.query('COMMIT');
        
        return result.rows[0] || { message: 'Stock updated successfully' };
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        
        if (err.message && err.message.includes('INSUFFICIENT_STOCK')) {
            const error = new Error(err.message);
            error.statusCode = 409;
            throw error;
        }

        if (err.message && err.message.includes('PRODUCT_NOT_FOUND_OR_INACTIVE')) {
            const error = new Error(err.message);
            error.statusCode = 404;
            throw error;
        }

        if (err.message && err.message.includes('INVALID_ADJUSTMENT')) {
            const error = new Error(err.message);
            error.statusCode = 400;
            throw error;
        }
        
        // Catch unique-violation on reference_id (Postgres code 23505)
        if (err.code === '23505') {
            let new_stock = 0;
            try {
                const currentResult = await pool.query('SELECT current_stock FROM inventory WHERE product_id = $1', [product_id]);
                new_stock = currentResult.rows.length ? currentResult.rows[0].current_stock : 0;
            } catch (queryErr) {
                console.error('Error fetching stock for idempotent response:', queryErr);
                const error = new Error('Internal Server Error');
                error.statusCode = 500;
                throw error;
            }
            const error = new Error('Already processed (idempotent via constraint)');
            error.statusCode = 200;
            error.data = { message: 'Already processed (idempotent via constraint)', new_stock };
            throw error;
        }
        
        console.error('apply_stock_change error:', err);
        const error = new Error('Internal Server Error');
        error.statusCode = 500;
        throw error;
    } finally {
        if (client) client.release();
    }
}

async function deductStock(data) {
    return applyStockChangeService({ ...data, changeType: 'out', source: 'sale' });
}

async function addStock(data) {
    return applyStockChangeService({ ...data, changeType: 'in', source: 'purchase' });
}

async function damageStock(data) {
    return applyStockChangeService({ ...data, changeType: 'damaged', source: 'damage_report' });
}

async function adjustStock(data) {
    return applyStockChangeService({ ...data, changeType: 'adjustment', source: 'manual' });
}

async function stockInManual(data) {
    return applyStockChangeService({ ...data, changeType: 'in', source: 'manual' });
}

async function getCurrentStock(productId) {
    const result = await pool.query('SELECT i.current_stock, p.min_stock_level FROM inventory i JOIN products p ON p.id = i.product_id WHERE i.product_id = $1', [productId]);
    return result.rows.length ? result.rows[0] : { current_stock: 0 };
}

async function getSummary() {
    const result = await pool.query(`
        SELECT 
            COUNT(i.*)::int as total_products, 
            COALESCE(SUM(i.current_stock), 0)::int as total_stock_items,
            COALESCE(SUM(CASE WHEN i.current_stock <= p.min_stock_level THEN 1 ELSE 0 END), 0)::int as low_stock_count
        FROM inventory i
        JOIN products p ON p.id = i.product_id
    `);
    return result.rows[0] || {};
}

async function getReport({ from, to, productId }) {
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
    const result = await pool.query(query, params);
    return { history: result.rows };
}

async function getLowStock() {
    const result = await pool.query('SELECT i.product_id, i.current_stock, p.min_stock_level FROM inventory i JOIN products p ON p.id = i.product_id WHERE i.current_stock <= p.min_stock_level');
    return { low_stock_products: result.rows };
}
async function getAllInventory({ search, viewFilter, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    
    let query = `
        SELECT 
            p.id, p.name, p.sku, p.min_stock_level as min,
            i.opening_stock as opening, i.stock_out as sold, i.damaged_stock as damaged, i.current_stock as current
        FROM inventory i
        JOIN products p ON p.id = i.product_id
    `;
    const params = [];
    const countParams = [];
    let countQuery = `SELECT COUNT(*)::int AS total FROM inventory i JOIN products p ON p.id = i.product_id`;
    
    let whereClauses = [];
    let countWhereClauses = [];

    if (search && search.trim()) {
        whereClauses.push(`(p.name ILIKE $1 OR p.sku ILIKE $1)`);
        countWhereClauses.push(`(p.name ILIKE $1 OR p.sku ILIKE $1)`);
        params.push(`%${search.trim()}%`);
        countParams.push(`%${search.trim()}%`);
    }

    if (viewFilter === "Low Stock") {
        whereClauses.push(`i.current_stock <= p.min_stock_level`);
        countWhereClauses.push(`i.current_stock <= p.min_stock_level`);
    } else if (viewFilter === "Damaged") {
        whereClauses.push(`i.damaged_stock > 0`);
        countWhereClauses.push(`i.damaged_stock > 0`);
    }

    if (whereClauses.length > 0) {
        query += ` WHERE ` + whereClauses.join(' AND ');
        countQuery += ` WHERE ` + countWhereClauses.join(' AND ');
    }

    let orderBy = ` ORDER BY p.name ASC`;
    if (viewFilter === "Damaged") {
        orderBy = ` ORDER BY i.damaged_stock DESC, p.name ASC`;
    }

    query += `${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [result, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams)
    ]);

    return {
        inventory: result.rows,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total: countResult.rows[0].total,
            totalPages: Math.ceil(countResult.rows[0].total / limit)
        }
    };
}

module.exports = {
    deductStock,
    addStock,
    damageStock,
    adjustStock,
    stockInManual,
    getCurrentStock,
    getSummary,
    getReport,
    getLowStock,
    getAllInventory
};
