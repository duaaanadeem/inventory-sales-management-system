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

module.exports = { getAllSuppliers, createSupplier };
