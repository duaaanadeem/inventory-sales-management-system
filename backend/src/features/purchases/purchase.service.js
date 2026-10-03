const pool = require("../../config/pg-db");

async function getAllPurchases({ search, status, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  let query = `
    SELECT p.*, s.name as supplier_name 
    FROM purchases p
    JOIN suppliers s ON s.id = p.supplier_id
  `;
  const params = [];
  const whereClauses = [];

  if (search && search.trim()) {
    whereClauses.push(`(s.name ILIKE $${params.length + 1} OR 'PO-' || lpad(p.id::text, 4, '0') ILIKE $${params.length + 1})`);
    params.push(`%${search.trim()}%`);
  }

  if (status && status !== 'All') {
    const statusMap = { "Paid": "completed", "Pending": "pending" };
    const mappedStatus = statusMap[status] || status;
    whereClauses.push(`p.status = $${params.length + 1}`);
    params.push(mappedStatus);
  }

  if (whereClauses.length > 0) {
    query += ` WHERE ` + whereClauses.join(' AND ');
  }

  const countQuery = `SELECT COUNT(*)::int AS total FROM purchases p JOIN suppliers s ON s.id = p.supplier_id` + 
                     (whereClauses.length > 0 ? ` WHERE ` + whereClauses.join(' AND ') : '');

  query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  
  const queryParams = [...params, limit, offset];

  const [result, countResult] = await Promise.all([
    pool.query(query, queryParams),
    pool.query(countQuery, params)
  ]);
  
  return {
    purchases: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: countResult.rows[0].total,
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    }
  };
}

async function getPurchaseItems(purchaseId) {
  const result = await pool.query(`
    SELECT pi.*, p.name 
    FROM purchase_items pi
    JOIN products p ON p.id = pi.product_id
    WHERE pi.purchase_id = $1
  `, [purchaseId]);
  return result.rows;
}

async function createPurchase(data) {
  const { supplier_id, purchase_date, items } = data;
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    // Calculate total cost
    let total_cost = 0;
    for (const item of items) {
      total_cost += item.quantity * item.cost;
    }

    const result = await client.query(
      `INSERT INTO purchases (supplier_id, purchase_date, total_cost, payment_status, status)
       VALUES ($1, $2, $3, 'unpaid', 'pending')
       RETURNING *`,
      [supplier_id, purchase_date, total_cost]
    );
    const purchase = result.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO purchase_items (purchase_id, product_id, quantity, cost)
         VALUES ($1, $2, $3, $4)`,
        [purchase.id, item.product_id, item.quantity, item.cost]
      );
    }
    
    await client.query("COMMIT");
    return purchase;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function completePurchase(purchaseId, adminId, damagedItems = []) {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    // Check purchase status
    const purchaseRes = await client.query(
      `SELECT status FROM purchases WHERE id = $1 FOR UPDATE`, 
      [purchaseId]
    );
    
    if (purchaseRes.rows.length === 0) {
      throw new Error("Purchase not found");
    }
    
    if (purchaseRes.rows[0].status === 'completed') {
      throw new Error("Purchase is already completed");
    }

    // Get items
    const itemsRes = await client.query(
      `SELECT * FROM purchase_items WHERE purchase_id = $1`,
      [purchaseId]
    );

    // Apply stock change for each item
    for (const item of itemsRes.rows) {
      const damagedRecord = damagedItems.find(d => d.product_id === item.product_id);
      const damagedQty = damagedRecord ? (Number(damagedRecord.damaged_qty) || 0) : 0;
      
      const cleanQty = item.quantity - damagedQty;

      if (cleanQty > 0) {
        await client.query(
          `SELECT apply_stock_change($1, $2, 'in', 'purchase', $3, $4)`,
          [item.product_id, cleanQty, purchaseId.toString(), adminId]
        );
      }

      if (damagedQty > 0) {
        await client.query(
          `SELECT apply_stock_change($1, $2, 'damaged', 'purchase', $3, $4)`,
          [item.product_id, damagedQty, purchaseId.toString() + '-damaged', adminId]
        );
      }
    }

    // Update status
    const updateRes = await client.query(
      `UPDATE purchases SET status = 'completed', payment_status = 'paid' WHERE id = $1 RETURNING *`,
      [purchaseId]
    );

    await client.query("COMMIT");
    return updateRes.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { getAllPurchases, createPurchase, completePurchase, getPurchaseItems };
