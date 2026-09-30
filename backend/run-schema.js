const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runSchema() {
  try {
    const schemaSql = fs.readFileSync('D:/Internship/Codecelix/Project 01/Inventory Management/latest-main-repo/docs/FULL_PROJECT_SCHEMA.sql', 'utf8');
    console.log("Executing schema...");
    await pool.query(schemaSql);
    console.log("Schema executed successfully.");
  } catch (err) {
    console.error("Error executing schema:", err);
  } finally {
    pool.end();
  }
}

runSchema();
