CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- v2: trigram indexes make ILIKE '%text%' customer search fast. Ships with Postgres
-- contrib; on a hosted DB enable it from the dashboard if this line is refused.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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
CREATE TYPE stock_source         AS ENUM ('sale', 'purchase', 'manual', 'damage_report', 'sale_return');  -- v2: 'sale_return' = stock put back when a sale is cancelled
CREATE TYPE payment_method_type  AS ENUM ('cash', 'card', 'online');
CREATE TYPE sale_status_type     AS ENUM ('completed', 'pending', 'cancelled');
CREATE TYPE purchase_status_type AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE payment_status_type  AS ENUM ('paid', 'partial', 'unpaid');
CREATE TYPE notification_type    AS ENUM ('low_stock', 'new_sale', 'purchase_received', 'other');

-- ============================================================================
-- REUSABLE TRIGGER FUNCTION: auto-update `updated_at`
-- Every table with an updated_at column reuses this ONE function instead
-- of every member hand-rolling "SET updated_at = NOW()" in their Node
-- update queries â€” guarantees it's never forgotten on some code path.
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 1. AUTH & ROLES â€” Shahid Roshan
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
-- 2. PRODUCT MANAGEMENT â€” Ch Muhammad Hammad Zahid
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
-- "revenue by category" aggregate query â€” both hit this column constantly.

COMMENT ON TABLE products IS 'Owned by Hammad. current stock quantity is NOT stored here â€” see inventory.current_stock (single source of truth, owned by Ali). Do not add a stock_quantity column here.';


-- ============================================================================
-- 3. INVENTORY MANAGEMENT â€” Muhammad Ali
-- ============================================================================
CREATE TABLE inventory (
  id                SERIAL PRIMARY KEY,
  product_id        INT NOT NULL UNIQUE REFERENCES products(id),  -- UNIQUE: exactly one inventory row per product, so "current_stock" is unambiguous
  opening_stock     INT NOT NULL DEFAULT 0 CHECK (opening_stock >= 0),
  stock_in          INT NOT NULL DEFAULT 0 CHECK (stock_in >= 0),
  stock_out         INT NOT NULL DEFAULT 0 CHECK (stock_out >= 0),
  damaged_stock     INT NOT NULL DEFAULT 0 CHECK (damaged_stock >= 0),
  adjustment_qty    INT NOT NULL DEFAULT 0,                       -- signed (can be +/-), so no CHECK >= 0 here â€” a correction can reduce stock
  current_stock     INT NOT NULL DEFAULT 0 CHECK (current_stock >= 0),  -- DB-level guarantee: stock can never go negative, even if app logic has a bug
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- v2: every product gets its inventory row automatically (all zeros), so
-- apply_stock_change never fails with 'No inventory row for product_id'.
-- Initial quantity: call apply_stock_change(id, qty, 'in', 'manual', NULL, admin_id)
-- after inserting the product (this also records it in stock_history).
-- Do NOT INSERT into inventory from Node - it would violate UNIQUE(product_id).
CREATE OR REPLACE FUNCTION create_inventory_row()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory (product_id) VALUES (NEW.id) ON CONFLICT (product_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_inventory
  AFTER INSERT ON products
  FOR EACH ROW EXECUTE FUNCTION create_inventory_row();

CREATE TABLE stock_history (
  id                SERIAL PRIMARY KEY,
  product_id        INT NOT NULL REFERENCES products(id),
  change_type       stock_change_type NOT NULL,
  qty               INT NOT NULL CHECK (change_type = 'adjustment' OR qty > 0),   -- always store the magnitude; direction comes from change_type, not sign â€” avoids "-5 in vs +5 out" ambiguity bugs
  previous_stock    INT NOT NULL,
  new_stock         INT NOT NULL,
  source            stock_source NOT NULL,
  reference_id      VARCHAR(64),        -- saleId / purchaseId â€” the idempotency key, see unique index below
  changed_by        INT REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency: if Waqas's or Kashif's service retries a request after a
-- timeout, this prevents the SAME sale/purchase from deducting or adding
-- stock twice. Partial index (WHERE reference_id IS NOT NULL) because
-- manual adjustments have no reference_id and shouldn't collide on NULL.
-- v2: product_id added to the key. A sale/purchase has several items, each a
-- different product, and each calls apply_stock_change with the SAME
-- (source, reference_id). Without product_id the 2nd item always failed.
CREATE UNIQUE INDEX uniq_stock_history_ref
  ON stock_history (source, reference_id, product_id)
  WHERE reference_id IS NOT NULL;

CREATE INDEX idx_stock_history_product ON stock_history (product_id);
-- Supports both Ali's "stock change history per product" view and
-- Qasim's inventory report queries filtered/joined by product.

CREATE INDEX idx_stock_history_created ON stock_history (created_at);
-- Reports module filters by date range (daily/weekly/monthly) â€” this
-- index makes that a range scan instead of a full table scan.


-- ----------------------------------------------------------------------------
-- FUNCTION: apply_stock_change
-- This is the ONE place stock math happens â€” pushed into the DB so that
-- every module (sale deduction, purchase addition, damage, manual
-- adjustment) goes through identical, transaction-safe logic instead of
-- each Node service reimplementing "read stock, compute, write stock"
-- and risking race conditions under concurrent requests.
--
-- Why a DB function instead of doing this in Node:
--   1. Row locking (FOR UPDATE) + the math happen in the SAME transaction
--      as the row read, with no network round-trip in between â€” closes
--      the race window where two concurrent sales both read stock=5,
--      both think they can deduct 3, and stock goes to -1.
--   2. The idempotency check (unique index) and the stock write commit
--      together or roll back together â€” can't have one without the other.
--   3. Less load on the Node process: no separate SELECT, app-side
--      calculation, then UPDATE round trip â€” it's one call.
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
  IF p_change_type != 'adjustment' AND p_qty <= 0 THEN
    RAISE EXCEPTION 'qty must be positive, got %', p_qty;
  END IF;

  IF p_change_type = 'adjustment' AND p_qty = 0 THEN
    RAISE EXCEPTION 'adjustment qty cannot be zero';
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
  'Single entry point for all stock changes. Node endpoints (deduct/add/damage/adjust) should call SELECT * FROM apply_stock_change(...) inside a transaction rather than writing to inventory/stock_history directly. p_reference_id is VARCHAR: from SQL/plpgsql pass sale_id::text (v2).';


-- ----------------------------------------------------------------------------
-- TRIGGER: low-stock notification
-- Runs inside the DB right after a stock_history row is inserted (i.e.
-- right after apply_stock_change runs), so Huzaifa's notification module
-- doesn't have to poll inventory on a schedule â€” a row just appears in
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

  -- v2: only notify if there is not already an UNREAD low_stock notification for
  -- this product, otherwise every sale below the minimum adds another duplicate.
  IF NEW.new_stock <= v_min AND NOT EXISTS (
       SELECT 1 FROM notifications
       WHERE type = 'low_stock' AND related_id = NEW.product_id AND is_read = FALSE
     ) THEN
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
