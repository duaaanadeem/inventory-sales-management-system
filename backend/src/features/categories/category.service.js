const pool = require("../../config/pg-db");

const getAllCategories = async () => {
  const result = await pool.query("SELECT id, name FROM categories ORDER BY name ASC");
  return result.rows;
};

const createCategory = async (name) => {
  const result = await pool.query(
    "INSERT INTO categories (name) VALUES ($1) RETURNING id, name",
    [name]
  );
  return result.rows[0];
};

module.exports = { getAllCategories, createCategory };
