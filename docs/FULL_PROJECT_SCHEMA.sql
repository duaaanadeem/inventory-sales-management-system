-- ============================================================================
-- Inventory & Sales Management System — FULL PROJECT SCHEMA (PostgreSQL)
-- Reference DDL covering all members' modules, with DB-side logic
-- (triggers/functions) so validation, stock math, and logging don't
-- have to be re-implemented correctly in every Node service that
-- touches these tables. Use this to cross-check teammates' schemas.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- ENUM TYPES
-- Declared as real Postgres ENUM types (not VARCHAR + CHECK) because:
--   - the DB engine rejects invalid values at the storage layer, so a bug
--     in any one member's Node code can't silently write garbage status
--     values that break another member's queries/reports.
--   - smaller on-disk footprint than VARCHAR, faster equality comparisons
--     for filtering (Search & Filters module relies on these a lot).
-- ============================================================================
CREATE TYPE user_role            AS ENUM ('admin', 'staff');
CREATE TYPE stock_change_type    AS ENUM ('in', 'out', 'damaged', 'adjustment');
CREATE TYPE stock_source         AS ENUM ('sale', 'purchase', 'manual', 'damage_report');
CREATE TYPE payment_method_type  AS ENUM ('cash', 'card', 'online');
CREATE TYPE sale_status_type     AS ENUM ('completed', 'pending', 'cancelled');
CREATE TYPE purchase_status_type AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE payment_status_type  AS ENUM ('paid', 'partial', 'unpaid');
CREATE TYPE notification_type    AS ENUM ('low_stock', 'new_sale', 'purchase_received', 'other');

-- ============================================================================
-- REUSABLE TRIGGER FUNCTION: auto-update `updated_at`
-- Every table with an updated_at column reuses this ONE function instead
-- of every member hand-rolling "SET updated_at = NOW()" in their Node
-- update queries — guarantees it's never forgotten on some code path.
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 1. AUTH & ROLES — Shahid Roshan
-- ============================================================================
CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  full_name       VARCHAR(100)  NOT NULL,
  email           VARCHAR(150)  NOT NULL UNIQUE,      -- UNIQUE = DB-enforced no-duplicate-login-email, don't rely on app-level check alone
  password_hash   VARCHAR(255)  NOT NULL,              -- bcrypt hash length is ~60 chars; 255 leaves headroom for future algo change
  role            user_role     NOT NULL DEFAULT 'staff',
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE, -- soft-disable instead of deleting, so historical FKs (sales.staff_id etc.) never break
  reset_token     VARCHAR(255),                        -- nullable: only set during forgot-password flow
  reset_token_expires TIMESTAMPTZ,                      -- TIMESTAMPTZ (not TIMESTAMP) everywhere: stores UTC, converts on read per client timezone
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE users IS 'Admin/staff accounts. Owned by Shahid (Auth & Roles).';
COMMENT ON COLUMN users.role IS 'admin = full access, staff = sales+inventory access only, enforced in app middleware using this column.';


-- ============================================================================
-- 2. PRODUCT MANAGEMENT — Ch Muhammad Hammad Zahid
-- ============================================================================
CREATE TABLE categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) NOT NULL UNIQUE   -- UNIQUE prevents "Electronics" and "electronics" duplicate rows from sloppy Node-side inserts (pair with app-level lowercasing)
);

CREATE TABLE products (
  id                SERIAL PRIMARY KEY,
  sku               VARCHAR(64)   NOT NULL UNIQUE,   -- SKU is the real-world unique identifier scanned at POS; UNIQUE here is the source of truth, not just an app check
  name              VARCHAR(150)  NOT NULL,
  category_id       INT           REFERENCES categories(id),
  price             NUMERIC(10,2) NOT NULL CHECK (price >= 0),  -- NUMERIC not FLOAT/REAL: money must never suffer binary floating-point rounding error, or reports/totals drift
  cost              NUMERIC(10,2) NOT NULL CHECK (cost >= 0),
  image_url         VARCHAR(255),
  min_stock_level   INT           NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,        -- soft-delete: products referenced by past sales/purchases can't be hard-deleted without breaking history
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_products_category ON products (category_id);
-- Speeds up Search & Filters' "filter by category" and Dashboard's
-- "revenue by category" aggregate query — both hit this column constantly.

COMMENT ON TABLE products IS 'Owned by Hammad. current stock quantity is NOT stored here — see inventory.current_stock (single source of truth, owned by Ali). Do not add a stock_quantity column here.';


-- ============================================================================
-- 3. INVENTORY MANAGEMENT — Muhammad Ali
-- ============================================================================
CREATE TABLE inventory (
  id                SERIAL PRIMARY KEY,
  product_id        INT NOT NULL UNIQUE REFERENCES products(id),  -- UNIQUE: exactly one inventory row per product, so "current_stock" is unambiguous
  opening_stock     INT NOT NULL DEFAULT 0 CHECK (opening_stock >= 0),
  stock_in          INT NOT NULL DEFAULT 0 CHECK (stock_in >= 0),
  stock_out         INT NOT NULL DEFAULT 0 CHECK (stock_out >= 0),
  damaged_stock     INT NOT NULL DEFAULT 0 CHECK (damaged_stock >= 0),
  adjustment_qty    INT NOT NULL DEFAULT 0,                       -- signed (can be +/-), so no CHECK >= 0 here — a correction can reduce stock
  current_stock     INT NOT NULL DEFAULT 0 CHECK (current_stock >= 0),  -- DB-level guarantee: stock can never go negative, even if app logic has a bug
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE stock_history (
  id                SERIAL PRIMARY KEY,
  product_id        INT NOT NULL REFERENCES products(id),
  change_type       stock_change_type NOT NULL,
  qty               INT NOT NULL CHECK (qty > 0),   -- always store the magnitude; direction comes from change_type, not sign — avoids "-5 in vs +5 out" ambiguity bugs
  previous_stock    INT NOT NULL,
  new_stock         INT NOT NULL,
  source            stock_source NOT NULL,
  reference_id      VARCHAR(64),        -- saleId / purchaseId — the idempotency key, see unique index below
  changed_by        INT REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency: if Waqas's or Kashif's service retries a request after a
-- timeout, this prevents the SAME sale/purchase from deducting or adding
-- stock twice. Partial index (WHERE reference_id IS NOT NULL) because
-- manual adjustments have no reference_id and shouldn't collide on NULL.
CREATE UNIQUE INDEX uniq_stock_history_ref
  ON stock_history (source, reference_id)
  WHERE reference_id IS NOT NULL;

CREATE INDEX idx_stock_history_product ON stock_history (product_id);
-- Supports both Ali's "stock change history per product" view and
-- Qasim's inventory report queries filtered/joined by product.

CREATE INDEX idx_stock_history_created ON stock_history (created_at);
-- Reports module filters by date range (daily/weekly/monthly) — this
-- index makes that a range scan instead of a full table scan.


-- ----------------------------------------------------------------------------
-- FUNCTION: apply_stock_change
-- This is the ONE place stock math happens — pushed into the DB so that
-- every module (sale deduction, purchase addition, damage, manual
-- adjustment) goes through identical, transaction-safe logic instead of
-- each Node service reimplementing "read stock, compute, write stock"
-- and risking race conditions under concurrent requests.
--
-- Why a DB function instead of doing this in Node:
--   1. Row locking (FOR UPDATE) + the math happen in the SAME transaction
--      as the row read, with no network round-trip in between — closes
--      the race window where two concurrent sales both read stock=5,
--      both think they can deduct 3, and stock goes to -1.
--   2. The idempotency check (unique index) and the stock write commit
--      together or roll back together — can't have one without the other.
--   3. Less load on the Node process: no separate SELECT, app-side
--      calculation, then UPDATE round trip — it's one call.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_stock_change(
  p_product_id   INT,
  p_qty          INT,
  p_change_type  stock_change_type,
  p_source       stock_source,
  p_reference_id VARCHAR,
  p_changed_by   INT
) RETURNS TABLE (new_stock INT) AS $$
DECLARE
  v_current INT;
  v_new     INT;
BEGIN
  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'qty must be positive, got %', p_qty;
  END IF;

  -- Lock the inventory row so concurrent calls for the same product
  -- serialize here instead of racing on the read.
  SELECT current_stock INTO v_current
  FROM inventory
  WHERE product_id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No inventory row for product_id %', p_product_id;
  END IF;

  IF p_change_type = 'out' THEN
    IF v_current < p_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: product % has % in stock, cannot deduct %',
        p_product_id, v_current, p_qty;
    END IF;
    v_new := v_current - p_qty;
    UPDATE inventory SET stock_out = stock_out + p_qty, current_stock = v_new
      WHERE product_id = p_product_id;

  ELSIF p_change_type = 'in' THEN
    v_new := v_current + p_qty;
    UPDATE inventory SET stock_in = stock_in + p_qty, current_stock = v_new
      WHERE product_id = p_product_id;

  ELSIF p_change_type = 'damaged' THEN
    IF v_current < p_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: cannot mark % damaged, only % in stock',
        p_qty, v_current;
    END IF;
    v_new := v_current - p_qty;
    UPDATE inventory SET damaged_stock = damaged_stock + p_qty, current_stock = v_new
      WHERE product_id = p_product_id;

  ELSIF p_change_type = 'adjustment' THEN
    -- adjustment can be a correction in either direction; p_qty is the
    -- magnitude, caller decides sign via a separate +/- flag at the API
    -- layer, or you can split into adjust_up/adjust_down variants.
    v_new := v_current + p_qty;
    UPDATE inventory SET adjustment_qty = adjustment_qty + p_qty, current_stock = v_new
      WHERE product_id = p_product_id;
  END IF;

  -- This INSERT is what triggers the low-stock check below (trigger on
  -- stock_history), and what Qasim's/Huzaifa's modules read from.
  INSERT INTO stock_history
    (product_id, change_type, qty, previous_stock, new_stock, source, reference_id, changed_by)
  VALUES
    (p_product_id, p_change_type, p_qty, v_current, v_new, p_source, p_reference_id, p_changed_by);

  RETURN QUERY SELECT v_new;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_stock_change IS
  'Single entry point for all stock changes. Node endpoints (deduct/add/damage/adjust) should call SELECT * FROM apply_stock_change(...) inside a transaction rather than writing to inventory/stock_history directly.';


-- ----------------------------------------------------------------------------
-- TRIGGER: low-stock notification
-- Runs inside the DB right after a stock_history row is inserted (i.e.
-- right after apply_stock_change runs), so Huzaifa's notification module
-- doesn't have to poll inventory on a schedule — a row just appears in
-- notifications the instant stock crosses the threshold.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_min   INT;
  v_name  VARCHAR;
BEGIN
  SELECT p.min_stock_level, p.name INTO v_min, v_name
  FROM products p WHERE p.id = NEW.product_id;

  IF NEW.new_stock <= v_min THEN
    INSERT INTO notifications (type, message, related_id)
    VALUES (
      'low_stock',
      v_name || ' is low in stock (' || NEW.new_stock || ' left, min ' || v_min || ')',
      NEW.product_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_history_low_stock
  AFTER INSERT ON stock_history
  FOR EACH ROW EXECUTE FUNCTION check_low_stock();


-- ============================================================================
-- 4. CUSTOMER MANAGEMENT — Omaima Atif
-- ============================================================================
CREATE TABLE customers (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  phone           VARCHAR(20),
  email           VARCHAR(150),
  address         VARCHAR(255),
  total_spending  NUMERIC(12,2) NOT NULL DEFAULT 0,  -- kept as a running total (denormalized) so Dashboard/Customer search don't need to SUM(sales) on every page load; kept correct via trigger below, not app code
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_name ON customers (name);
-- Customer search ("Admin should be able to search customers") hits this.


-- ============================================================================
-- 5. SALES / POS SYSTEM — Muhammad Waqas
-- ============================================================================
CREATE TABLE sales (
  id              SERIAL PRIMARY KEY,
  customer_id     INT REFERENCES customers(id),   -- nullable: walk-in customers with no record are allowed
  staff_id        INT NOT NULL REFERENCES users(id),
  subtotal        NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  tax             NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total           NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  payment_method  payment_method_type NOT NULL,
  status          sale_status_type NOT NULL DEFAULT 'completed',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_status  ON sales (status);
CREATE INDEX idx_sales_payment ON sales (payment_method);
CREATE INDEX idx_sales_created ON sales (created_at);
-- All three back Search & Filters ("Date", "Payment Method", "Sale Status")
-- and Reports' daily/weekly/monthly queries — these are the columns
-- WHERE-clauses will actually filter on, so they're indexed individually
-- rather than guessing at a composite index before real query patterns exist.

CREATE TABLE sale_items (
  id          SERIAL PRIMARY KEY,
  sale_id     INT NOT NULL REFERENCES sales(id),
  product_id  INT NOT NULL REFERENCES products(id),
  quantity    INT NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),  -- snapshot of price at sale time — do NOT join to products.price for historical totals, product prices change over time
  line_total  NUMERIC(12,2) NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX idx_sale_items_sale    ON sale_items (sale_id);
CREATE INDEX idx_sale_items_product ON sale_items (product_id);
-- product_id index backs "top-selling products" and "product sales report" aggregates.

CREATE TABLE invoices (
  id              SERIAL PRIMARY KEY,
  sale_id         INT NOT NULL UNIQUE REFERENCES sales(id),
  invoice_number  VARCHAR(32) NOT NULL UNIQUE,  -- human-facing receipt number, separate from internal sale_id so it can follow a business numbering scheme
  pdf_url         VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ----------------------------------------------------------------------------
-- TRIGGER: keep customers.total_spending in sync
-- Runs in the DB instead of Node doing "UPDATE customers SET total_spending
-- = total_spending + X" as a separate query after inserting a sale —
-- guarantees the two numbers can never drift apart even if the app
-- crashes between the two writes, because they're the same transaction.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_customer_spending()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.status = 'completed' THEN
    UPDATE customers
    SET total_spending = total_spending + NEW.total
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sales_customer_spending
  AFTER INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION update_customer_spending();

COMMENT ON TABLE sales IS 'Owned by Waqas. INTEGRATION: on completion, backend must call SELECT apply_stock_change(product_id, qty, ''out'', ''sale'', sale_id, staff_id) per sale_item BEFORE committing status = completed, inside the same transaction — see apply_stock_change().';


-- ============================================================================
-- 6. SUPPLIER MANAGEMENT — Kashif Hayat
-- ============================================================================
CREATE TABLE suppliers (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  company     VARCHAR(100),
  phone       VARCHAR(20),
  email       VARCHAR(150),
  address     VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_name ON suppliers (name);

CREATE TABLE supplier_products (
  id           SERIAL PRIMARY KEY,
  supplier_id  INT NOT NULL REFERENCES suppliers(id),
  product_id   INT NOT NULL REFERENCES products(id),
  UNIQUE (supplier_id, product_id)  -- prevents the same supplier-product link being added twice by accident
);


-- ============================================================================
-- 7. PURCHASE MANAGEMENT — Kashif Hayat
-- ============================================================================
CREATE TABLE purchases (
  id              SERIAL PRIMARY KEY,
  supplier_id     INT NOT NULL REFERENCES suppliers(id),
  purchase_date   DATE NOT NULL,
  payment_status  payment_status_type NOT NULL DEFAULT 'unpaid',
  status          purchase_status_type NOT NULL DEFAULT 'pending',
  total_cost      NUMERIC(12,2) NOT NULL CHECK (total_cost >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_items (
  id            SERIAL PRIMARY KEY,
  purchase_id   INT NOT NULL REFERENCES purchases(id),
  product_id    INT NOT NULL REFERENCES products(id),
  quantity      INT NOT NULL CHECK (quantity > 0),
  cost          NUMERIC(10,2) NOT NULL CHECK (cost >= 0)   -- snapshot of cost at purchase time, same reasoning as sale_items.unit_price
);

CREATE INDEX idx_purchase_items_purchase ON purchase_items (purchase_id);
CREATE INDEX idx_purchases_status ON purchases (status);

COMMENT ON TABLE purchases IS 'Owned by Kashif. INTEGRATION: when status transitions to completed, call SELECT apply_stock_change(product_id, qty, ''in'', ''purchase'', purchase_id, admin_id) per purchase_item, in the same transaction as the status update.';


-- ============================================================================
-- 8. NOTIFICATIONS & ACTIVITY LOG — M. Huzaifa Yousaf
-- ============================================================================
CREATE TABLE notifications (
  id          SERIAL PRIMARY KEY,
  type        notification_type NOT NULL,
  message     VARCHAR(255) NOT NULL,
  related_id  INT,     -- meaning depends on `type` (product_id for low_stock, sale_id for new_sale, etc.) — document this at the API layer, not enforceable as a strict FK since it points to different tables
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_unread ON notifications (is_read) WHERE is_read = FALSE;
-- Partial index: the notification bell only ever queries "unread ones",
-- never the full read history, so indexing just that subset keeps it tiny and fast.

CREATE TABLE activity_log (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id),
  action       VARCHAR(255) NOT NULL,  -- e.g. 'Admin Added Product', 'Staff Generated Invoice' — human-readable, not a coded enum, since this is a free-form audit trail
  entity_type  VARCHAR(50),            -- 'product' | 'sale' | 'stock' | 'supplier' etc.
  entity_id    INT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_created ON activity_log (created_at);


-- ============================================================================
-- 9. REPORTS & EXPORT — Qasim Zahoor
-- ============================================================================
-- No dedicated tables. Reports are read-only aggregate queries over
-- sales, sale_items, inventory, stock_history, customers, purchases,
-- purchase_items. The indexes already declared above on created_at,
-- status, and product_id are what make these reports fast — if Qasim's
-- queries are slow, check whether he's filtering on an unindexed column
-- before adding a new index.

-- Example read-only view to save Qasim re-writing this join everywhere:
CREATE VIEW v_daily_sales AS
SELECT
  DATE(created_at) AS sale_date,
  COUNT(*)          AS num_sales,
  SUM(total)        AS revenue
FROM sales
WHERE status = 'completed'
GROUP BY DATE(created_at);

COMMENT ON VIEW v_daily_sales IS 'Convenience view for Reports module — daily revenue rollup. Add similar views (v_monthly_sales, v_product_sales) as needed rather than duplicating this GROUP BY logic in Node.';


-- ============================================================================
-- 10. SEARCH & FILTERS — Team Leader
-- ============================================================================
-- No new tables. Operates on existing indexed columns:
--   products(category_id, sku), sales(status, payment_method, created_at),
--   customers(name), suppliers(name), stock_history(created_at, product_id).
-- All relevant indexes are declared inline next to their owning table
-- above, rather than centralized here, so each module's owner can see
-- at a glance what's already indexed on their own table.


-- ============================================================================
-- INTEGRATION CHECKLIST (cross-module rules to enforce in meeting)
-- ============================================================================
-- 1. current_stock lives ONLY in inventory — products must NOT gain a
--    stock_quantity column, or two sources of truth drift apart.
-- 2. ALL stock changes go through apply_stock_change() — no module
--    (including Ali's own future code) should INSERT/UPDATE inventory
--    or stock_history directly. This is what keeps the low-stock
--    trigger and idempotency guarantee reliable.
-- 3. sale_id / purchase_id is passed as reference_id into
--    apply_stock_change for idempotency — retries must not double-apply.
-- 4. Migration order: users, categories, products BEFORE inventory,
--    customers, sales, suppliers, purchases, notifications, activity_log
--    (FK dependency order).
-- 5. Money: NUMERIC everywhere, never FLOAT/REAL/DOUBLE PRECISION.
-- 6. Timestamps: TIMESTAMPTZ everywhere (stores UTC internally,
--    Postgres converts on SELECT per session timezone) — never plain
--    TIMESTAMP, or Fatima's frontend will show wrong times across devices.
-- 7. DB-side logic (triggers/functions above) exists specifically to
--    take repeated read-then-write and consistency logic OFF the Node
--    process and onto the DB engine, which is built for exactly this —
--    fewer round trips per request, and correctness guaranteed even
--    under concurrent requests, not just "usually correct."
