const pool = require("../../config/pg-db");

async function getAllSuppliers({ search, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  let query = `SELECT * FROM suppliers`;
  const params = [];

  if (search && search.trim()) {
    query += ` WHERE name ILIKE $1 OR company ILIKE $1`;
    params.push(`%${search.trim()}%`);
  }

  query += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  let countQuery = `SELECT COUNT(*)::int AS total FROM suppliers`;
  const countParams = [];
  if (search && search.trim()) {
    countQuery += ` WHERE name ILIKE $1 OR company ILIKE $1`;
    countParams.push(`%${search.trim()}%`);
  }

  const [result, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, countParams)
  ]);

  return {
    suppliers: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: countResult.rows[0].total,
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    }
  };
}

async function createSupplier(data) {
  const { name, company, phone, email, address } = data;
  const result = await pool.query(
    `INSERT INTO suppliers (name, company, phone, email, address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, company, phone, email, address]
  );
  return result.rows[0];
}

async function getSupplierSummary(supplierId) {
  // Get summary stats
  const summaryRes = await pool.query(
    `SELECT
      COUNT(*) AS total_orders,
      COALESCE(SUM(total_cost), 0) AS total_spent,
      COALESCE(SUM(CASE WHEN payment_status IN ('unpaid', 'partial') THEN total_cost ELSE 0 END), 0) AS total_unpaid
    FROM purchases
    WHERE supplier_id = $1`,
    [supplierId]
  );

  // Get order history
  const ordersRes = await pool.query(
    `SELECT id, purchase_date, total_cost, status, payment_status, created_at
     FROM purchases
     WHERE supplier_id = $1
     ORDER BY created_at DESC`,
    [supplierId]
  );

  return {
    summary: summaryRes.rows[0] || { total_orders: 0, total_spent: 0, total_unpaid: 0 },
    orders: ordersRes.rows
  };
}

module.exports = { getAllSuppliers, createSupplier, getSupplierSummary };
