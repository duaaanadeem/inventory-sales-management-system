const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const pool = require("../config/pg-db");

dotenv.config();

const createAdmin = async () => {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 12 characters.");
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const result = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [ADMIN_NAME.trim(), ADMIN_EMAIL.trim().toLowerCase(), passwordHash]
  );

  if (result.rowCount === 0) {
    throw new Error("An account with ADMIN_EMAIL already exists; no changes were made.");
  }

  console.log(`Administrator account created (id ${result.rows[0].id}).`);
};

createAdmin()
  .catch((error) => {
    console.error("Administrator creation failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
