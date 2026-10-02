const pool = require("../../config/pg-db");

async function getAllSuppliers() {
  const result = await pool.query(`SELECT * FROM suppliers ORDER BY name ASC`);
  return result.rows;
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
