/**
 * db.js — PostgreSQL connection pool (using "pg").
 *
 * A Pool keeps several open connections ready to reuse, instead of
 * opening a new one per request (slow + wasteful).
 */
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Log unexpected pool errors so the server doesn't crash silently
pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error on idle client:", err.message);
});

// Checked once at startup — fail fast if DB is unreachable
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log("PostgreSQL connected successfully");
    client.release();
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message);
    process.exit(1);
  }
};

/**
 * query() — small helper so modules don't import the whole pool.
 * Always use $1, $2... placeholders (never string-concat SQL — SQL injection risk).
 */
const query = (text, params) => pool.query(text, params);

// Needed only when 2+ queries must run as one all-or-nothing transaction
const getClient = () => pool.connect();

module.exports = { pool, query, getClient, connectDB };
