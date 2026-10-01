const pool = require("../../config/pg-db");

async function getAllPurchases() {
  const result = await pool.query(`
    SELECT p.*, s.name as supplier_name 
    FROM purchases p
    JOIN suppliers s ON s.id = p.supplier_id
    ORDER BY p.created_at DESC
  `);
  return result.rows;
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
      `UPDATE purchases SET status = 'completed' WHERE id = $1 RETURNING *`,
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
