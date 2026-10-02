const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const runSeed = async () => {
  const seedPath = path.join(__dirname, "seed.sql");
  const seedSql = fs.readFileSync(seedPath, "utf8");

  console.log("Adding demo categories, products, and opening stock...");

  try {
    await pool.query(seedSql);
    console.log("Seed data added successfully.");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

runSeed();
