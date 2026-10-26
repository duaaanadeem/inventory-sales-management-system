const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be configured before running the schema initializer.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const runMigration = async () => {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  let client;

  try {
    client = await pool.connect();
    const existingTables = await client.query(
      `SELECT tablename
       FROM pg_catalog.pg_tables
       WHERE schemaname = current_schema()
       ORDER BY tablename`
    );

    if (existingTables.rowCount > 0) {
      throw new Error(
        `Refusing to initialize a database containing tables (${existingTables.rows.map((row) => row.tablename).join(", ")}).`
      );
    }

    await client.query("BEGIN");
    await client.query(schemaSql);
    await client.query("COMMIT");
    console.log("Schema initialized successfully on an empty database.");
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch((rollbackError) => {
        console.error("Migration rollback failed:", rollbackError.message);
      });
    }
    console.error("Schema initialization failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
};

runMigration();
