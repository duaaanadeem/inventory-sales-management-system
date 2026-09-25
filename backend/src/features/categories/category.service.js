/**
 * category.service.js — DB layer. Categories are simple: just id + name.
 * Kept separate from Products so a change here can't accidentally break
 * the product endpoints other teammates depend on.
 */
const { query } = require("../../config/db");

const getAllCategories = async () => {
  const result = await query("SELECT id, name FROM categories ORDER BY name ASC");
  return result.rows;
};

const createCategory = async (name) => {
  const result = await query(
    "INSERT INTO categories (name) VALUES ($1) RETURNING id, name",
    [name]
  );
  return result.rows[0];
};

module.exports = { getAllCategories, createCategory };
