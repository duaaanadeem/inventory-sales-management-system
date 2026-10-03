const pool = require('../../config/db');

async function getSalesReport(type, { from, to }) {
    let dateTrunc;
    if (type === 'daily') dateTrunc = 'day';
    else if (type === 'weekly') dateTrunc = 'week';
    else if (type === 'monthly') dateTrunc = 'month';
    else throw new Error('Invalid report type');

    let query = `
        SELECT 
            DATE_TRUNC($1, created_at) as sale_date,
            COUNT(id)::int as num_sales,
            SUM(total) as revenue
        FROM sales
        WHERE status = 'completed'
    `;
    const params = [dateTrunc];
    let paramCount = 2;

    if (from) {
        query += ` AND created_at >= $${paramCount++}`;
        params.push(from);
    }
    if (to) {
        query += ` AND created_at <= $${paramCount++}`;
        params.push(to);
    }

    query += ` GROUP BY DATE_TRUNC($1, created_at) ORDER BY sale_date ASC`;

    const result = await pool.query(query, params);
    
    const labels = [];
    const revenue = [];
    const orders = [];
    const avg_order_value = [];

    result.rows.forEach(row => {
        const dateObj = new Date(row.sale_date);
        let labelStr = dateObj.toISOString().split('T')[0];
        labels.push(labelStr);
        const rev = parseFloat(row.revenue) || 0;
        revenue.push(rev);
        orders.push(row.num_sales);
        avg_order_value.push(row.num_sales > 0 ? (rev / row.num_sales) : 0);
    });

    return { labels, revenue, orders, avg_order_value };
}

async function getProductSalesReport({ from, to, limit = 10 }) {
    let query = `
        SELECT 
            p.name,
            p.sku,
            SUM(si.quantity)::int as qty_sold,
            SUM(si.line_total) as revenue
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
        WHERE s.status = 'completed'
    `;
    const params = [];
    let paramCount = 1;

    if (from) {
        query += ` AND s.created_at >= $${paramCount++}`;
        params.push(from);
    }
    if (to) {
        query += ` AND s.created_at <= $${paramCount++}`;
        params.push(to);
    }

    query += ` GROUP BY p.id, p.name, p.sku ORDER BY qty_sold DESC, revenue DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return { products: result.rows };
}

async function getInventoryReport({ productId } = {}) {
    let query = `
        SELECT 
            p.name, 
            p.sku, 
            i.current_stock, 
            p.min_stock_level as min_stock, 
            i.opening_stock as opening, 
            i.stock_in, 
            i.stock_out, 
            i.damaged_stock as damaged,
            CASE 
                WHEN i.current_stock <= 0 THEN 'Critical'
                WHEN i.current_stock <= p.min_stock_level THEN 'Low'
                ELSE 'OK'
            END as status
        FROM inventory i
        JOIN products p ON p.id = i.product_id
    `;
    const params = [];
    if (productId) {
        query += ` WHERE p.id = $1`;
        params.push(productId);
    }
    query += ` ORDER BY p.name ASC`;
    const result = await pool.query(query, params);
    return { items: result.rows };
}

async function getProfitReport({ from, to }) {
    let query = `
        SELECT 
            p.name,
            p.sku,
            SUM(si.quantity)::int as qty_sold,
            SUM(si.line_total) as revenue,
            SUM(p.cost * si.quantity) as cost_total
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
        WHERE s.status = 'completed'
    `;
    const params = [];
    let paramCount = 1;

    if (from) {
        query += ` AND s.created_at >= $${paramCount++}`;
        params.push(from);
    }
    if (to) {
        query += ` AND s.created_at <= $${paramCount++}`;
        params.push(to);
    }

    query += ` GROUP BY p.id, p.name, p.sku ORDER BY revenue DESC`;

    const result = await pool.query(query, params);
    
    let totalRevenue = 0;
    let totalCost = 0;
    
    const items = result.rows.map(row => {
        const rev = parseFloat(row.revenue) || 0;
        const cst = parseFloat(row.cost_total) || 0;
        const profit = rev - cst;
        const margin_pct = rev > 0 ? ((profit / rev) * 100).toFixed(2) : 0;
        totalRevenue += rev;
        totalCost += cst;
        return {
            ...row,
            profit: profit.toFixed(2),
            margin_pct
        };
    });

    const totalProfit = totalRevenue - totalCost;
    const totals = {
        revenue: totalRevenue.toFixed(2),
        cost_total: totalCost.toFixed(2),
        profit: totalProfit.toFixed(2),
        margin_pct: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0
    };

    return { items, totals };
}

async function getCustomerReport({ from, to, limit = 10 }) {
    let query = `
        SELECT 
            c.name,
            c.phone,
            COUNT(s.id)::int as orders_count,
            SUM(s.total) as total_spending,
            MAX(s.created_at) as last_purchase_at
        FROM customers c
        JOIN sales s ON s.customer_id = c.id
        WHERE s.status = 'completed'
    `;
    
    const params = [];
    let paramCount = 1;

    if (from) {
        query += ` AND s.created_at >= $${paramCount++}`;
        params.push(from);
    }
    if (to) {
        query += ` AND s.created_at <= $${paramCount++}`;
        params.push(to);
    }

    query += ` GROUP BY c.id, c.name, c.phone ORDER BY total_spending DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return { customers: result.rows };
}

async function getSupplierReport({ from, to }) {
    let query = `
        SELECT 
            s.name,
            s.company,
            COUNT(p.id)::int as orders_count,
            SUM(p.total_cost) as total_cost,
            MAX(p.created_at) as last_purchase_at
        FROM suppliers s
        JOIN purchases p ON p.supplier_id = s.id
        WHERE p.status = 'completed'
    `;
    
    const params = [];
    let paramCount = 1;

    if (from) {
        query += ` AND p.created_at >= $${paramCount++}`;
        params.push(from);
    }
    if (to) {
        query += ` AND p.created_at <= $${paramCount++}`;
        params.push(to);
    }

    query += ` GROUP BY s.id, s.name, s.company ORDER BY total_cost DESC`;

    const result = await pool.query(query, params);
    return { suppliers: result.rows };
}

module.exports = {
    getSalesReport,
    getProductSalesReport,
    getInventoryReport,
    getProfitReport,
    getCustomerReport,
    getSupplierReport
};
