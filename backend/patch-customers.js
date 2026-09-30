const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runPatch() {
  try {
    console.log("Adding updated_at to customers...");
    await pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();');
    console.log("Column added.");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

runPatch();
