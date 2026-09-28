const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const runMigration = async () => {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");

  console.log("Running schema.sql (v3) on database...");

  try {
    await pool.query(schemaSql);
    console.log("Schema created successfully.");
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

runMigration();
