const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const patchSql = `
CREATE TABLE IF NOT EXISTS customers (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  phone           VARCHAR(20),
  email           VARCHAR(150),
  address         VARCHAR(255),
  total_spending  NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);

CREATE TABLE IF NOT EXISTS suppliers (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  company     VARCHAR(100),
  phone       VARCHAR(20),
  email       VARCHAR(150),
  address     VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers (name);

CREATE TABLE IF NOT EXISTS supplier_products (
  id           SERIAL PRIMARY KEY,
  supplier_id  INT NOT NULL REFERENCES suppliers(id),
  product_id   INT NOT NULL REFERENCES products(id),
  UNIQUE (supplier_id, product_id)
);

CREATE TABLE IF NOT EXISTS purchases (
  id              SERIAL PRIMARY KEY,
  supplier_id     INT NOT NULL REFERENCES suppliers(id),
  purchase_date   DATE NOT NULL,
  payment_status  payment_status_type NOT NULL DEFAULT 'unpaid',
  status          purchase_status_type NOT NULL DEFAULT 'pending',
  total_cost      NUMERIC(12,2) NOT NULL CHECK (total_cost >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id            SERIAL PRIMARY KEY,
  purchase_id   INT NOT NULL REFERENCES purchases(id),
  product_id    INT NOT NULL REFERENCES products(id),
  quantity      INT NOT NULL CHECK (quantity > 0),
  cost          NUMERIC(10,2) NOT NULL CHECK (cost >= 0)
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items (purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases (status);
`;

async function runPatch() {
  try {
    console.log("Executing missing tables patch...");
    await pool.query(patchSql);
    console.log("Patch executed successfully. Missing tables are now in your database.");
  } catch (err) {
    console.error("Error executing patch:", err);
  } finally {
    pool.end();
  }
}

runPatch();
