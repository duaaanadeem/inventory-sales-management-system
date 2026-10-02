// backend/src/customers/customer.service.js
const pool = require('../config/pg-db');
const { escapeLike, parseDate } = require('./customer.validation');

const SORT_COLUMNS = { name: 'name', total_spending: 'total_spending', created_at: 'created_at' };
const COLS = `id, name, phone, email, address, total_spending, is_active, created_at, updated_at`;

async function listCustomers({ search, sort, order, page, limit, offset }) {
  const sortCol = SORT_COLUMNS[sort] || SORT_COLUMNS.name;
  const dir = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const pattern = search && search.trim() ? `%${escapeLike(search.trim())}%` : null;

  const where = `is_active = TRUE
    AND ($1::text IS NULL OR name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)`;

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT ${COLS} FROM customers
        WHERE ${where}
        ORDER BY ${sortCol} ${dir}, id ASC
        LIMIT $2 OFFSET $3`,
      [pattern, limit, offset]
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM customers WHERE ${where}`, [pattern]),
  ]);

  const total = count.rows[0].total;
  return {
    customers: rows.rows,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

// Answers "total number of customers" (active only, matching v_dashboard_summary.total_customers).
async function countCustomers() {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS total FROM customers WHERE is_active = TRUE`);
  return { total: rows[0].total };
}

async function getCustomer(id) {
  const { rows } = await pool.query(
    `SELECT ${COLS},
            (SELECT COUNT(*)::int FROM sales s WHERE s.customer_id = customers.id AND s.status = 'completed') AS orders_count,
            (SELECT MAX(s.created_at) FROM sales s WHERE s.customer_id = customers.id AND s.status = 'completed') AS last_purchase_at
       FROM customers
      WHERE id = $1 AND is_active = TRUE`,
    [id]
  );
  if (!rows.length) {
    const err = new Error('Customer not found');
    err.status = 404;
    throw err;
  }
  return rows[0];
}

async function createCustomer(fields, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO customers (name, phone, email, address)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLS}`,
      [fields.name, fields.phone, fields.email, fields.address]
    );
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id) VALUES ($1, $2, 'customer', $3)`,
      [user.id, `${cap(user.role || 'staff')} Added Customer`, rows[0].id]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function updateCustomer(id, fields, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE customers SET name = $2, phone = $3, email = $4, address = $5
        WHERE id = $1 AND is_active = TRUE
        RETURNING ${COLS}`,
      [id, fields.name, fields.phone, fields.email, fields.address]
    );
    if (!rows.length) {
      const err = new Error('Customer not found');
      err.status = 404;
      throw err;
    }
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id) VALUES ($1, $2, 'customer', $3)`,
      [user.id, `${cap(user.role || 'staff')} Updated Customer`, id]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Soft delete: sales.customer_id (ON DELETE SET NULL in schemav3) means a hard
// delete wouldn't even fail, it would just orphan the customer_id on old sales -
// so total_spending history would look like it belonged to no one. Soft delete keeps it intact.
async function removeCustomer(id, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      `UPDATE customers SET is_active = FALSE WHERE id = $1 AND is_active = TRUE`,
      [id]
    );
    if (!rowCount) {
      const err = new Error('Customer not found');
      err.status = 404;
      throw err;
    }
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id) VALUES ($1, $2, 'customer', $3)`,
      [user.id, `${cap(user.role || 'staff')} Removed Customer`, id]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function getPurchaseHistory(id, { from, to, page, limit, offset }) {
  await getCustomer(id); // 404s if missing/removed
  const fromDate = parseDate(from, 'from');
  const toDate = parseDate(to, 'to');

  const where = `s.customer_id = $1
    AND ($2::date IS NULL OR s.created_at >= $2::date)
    AND ($3::date IS NULL OR s.created_at < ($3::date + 1))`;

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT s.id, s.created_at, s.subtotal, s.discount, s.tax, s.total,
              s.payment_method, s.status, i.invoice_number,
              COALESCE(
                json_agg(
                  json_build_object(
                    'product_id', si.product_id, 'name', p.name, 'sku', p.sku,
                    'quantity', si.quantity, 'unit_price', si.unit_price, 'line_total', si.line_total
                  ) ORDER BY si.id
                ) FILTER (WHERE si.id IS NOT NULL), '[]'::json
              ) AS items
         FROM sales s
         LEFT JOIN invoices   i  ON i.sale_id = s.id
         LEFT JOIN sale_items si ON si.sale_id = s.id
         LEFT JOIN products   p  ON p.id = si.product_id
        WHERE ${where}
        GROUP BY s.id, i.invoice_number
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT $4 OFFSET $5`,
      [id, fromDate, toDate, limit, offset]
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM sales s WHERE ${where}`, [id, fromDate, toDate]),
  ]);

  const total = count.rows[0].total;
  return {
    purchases: rows.rows,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

module.exports = {
  listCustomers, countCustomers, getCustomer, createCustomer, updateCustomer, removeCustomer, getPurchaseHistory,
};
