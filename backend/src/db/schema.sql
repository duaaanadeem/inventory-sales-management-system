-- INVENTORY & SALES MANAGEMENT SYSTEM
-- FULL PROJECT DATABASE SCHEMA
-- PostgreSQL
-- v3 FIXES / IMPROVEMENTS
-- 1. Stock adjustment now supports BOTH positive and negative corrections.
-- 2. Stock can never become negative.
-- 3. Stock history records every stock change.
-- 4. Multi-product sale/purchase idempotency includes product_id.
-- 5. Sale cancellation can return stock.
-- 6. Purchase cancellation can return purchased stock.
-- 7. Product automatically receives an inventory row.
-- 8. Low-stock notifications avoid unread duplicates.
-- 9. Customer total spending handles INSERT/UPDATE/DELETE/status changes.
-- 10. Sale/purchase totals can be validated through DB functions.
-- 11. Money uses NUMERIC, never FLOAT.
-- 12. Timestamps use TIMESTAMPTZ.
-- 13. Soft delete is used for customers/products/users.
-- 14. Search indexes added where useful.
-- 15. FK/report indexes added.
-- 16. Activity log and notifications included.
-- 17. Reports use views/queries instead of duplicate report tables.


-- 0. EXTENSIONS

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- 1. ENUM TYPES

CREATE TYPE user_role AS ENUM (
  'admin',
  'staff'
);

CREATE TYPE stock_change_type AS ENUM (
  'in',
  'out',
  'damaged',
  'adjustment'
);

CREATE TYPE stock_source AS ENUM (
  'sale',
  'purchase',
  'manual',
  'damage_report',
  'sale_return',
  'purchase_return'
);

CREATE TYPE payment_method_type AS ENUM (
  'cash',
  'card',
  'online'
);

CREATE TYPE sale_status_type AS ENUM (
  'completed',
  'pending',
  'cancelled'
);

CREATE TYPE purchase_status_type AS ENUM (
  'pending',
  'completed',
  'cancelled'
);

CREATE TYPE payment_status_type AS ENUM (
  'paid',
  'partial',
  'unpaid'
);

CREATE TYPE notification_type AS ENUM (
  'low_stock',
  'new_sale',
  'purchase_received',
  'other'
);


-- 2. COMMON UPDATED_AT TRIGGER

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- 3. USERS / AUTHENTICATION

CREATE TABLE users (
  id                   SERIAL PRIMARY KEY,
  full_name            VARCHAR(100) NOT NULL
                       CHECK (btrim(full_name) <> ''),

  email                VARCHAR(150) NOT NULL,

  password_hash        VARCHAR(255) NOT NULL,

  role                 user_role NOT NULL DEFAULT 'staff',

  is_active            BOOLEAN NOT NULL DEFAULT TRUE,

  reset_token          VARCHAR(255),

  reset_token_expires  TIMESTAMPTZ,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_users_email
ON users (LOWER(email));

CREATE INDEX idx_users_role
ON users (role);

CREATE INDEX idx_users_active
ON users (is_active);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- 4. CATEGORIES

CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,

  name        VARCHAR(100) NOT NULL
              CHECK (btrim(name) <> ''),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_categories_name
ON categories (LOWER(name));

CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- 5. PRODUCTS

CREATE TABLE products (
  id                SERIAL PRIMARY KEY,

  sku               VARCHAR(64) NOT NULL,

  name              VARCHAR(150) NOT NULL
                    CHECK (btrim(name) <> ''),

  category_id       INT
                    REFERENCES categories(id)
                    ON UPDATE CASCADE
                    ON DELETE SET NULL,

  price             NUMERIC(12,2) NOT NULL
                    CHECK (price >= 0),

  cost              NUMERIC(12,2) NOT NULL
                    CHECK (cost >= 0),

  image_url         VARCHAR(500),

  min_stock_level   INT NOT NULL DEFAULT 0
                    CHECK (min_stock_level >= 0),

  is_active         BOOLEAN NOT NULL DEFAULT TRUE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_products_sku
ON products (LOWER(sku));

CREATE INDEX idx_products_category
ON products (category_id);

CREATE INDEX idx_products_name
ON products (name);

CREATE INDEX idx_products_active
ON products (is_active);

CREATE INDEX idx_products_name_trgm
ON products USING gin (name gin_trgm_ops);

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- 6. INVENTORY

CREATE TABLE inventory (
  id                SERIAL PRIMARY KEY,

  product_id        INT NOT NULL UNIQUE
                    REFERENCES products(id)
                    ON DELETE CASCADE,

  opening_stock     INT NOT NULL DEFAULT 0
                    CHECK (opening_stock >= 0),

  stock_in          INT NOT NULL DEFAULT 0
                    CHECK (stock_in >= 0),

  stock_out         INT NOT NULL DEFAULT 0
                    CHECK (stock_out >= 0),

  damaged_stock     INT NOT NULL DEFAULT 0
                    CHECK (damaged_stock >= 0),

  adjustment_qty    INT NOT NULL DEFAULT 0,

  current_stock     INT NOT NULL DEFAULT 0
                    CHECK (current_stock >= 0),

  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_current_stock
ON inventory (current_stock);

CREATE INDEX idx_inventory_low_stock
ON inventory (current_stock);

CREATE TRIGGER trg_inventory_updated_at
BEFORE UPDATE ON inventory
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- 7. AUTOMATIC INVENTORY ROW FOR NEW PRODUCT

CREATE OR REPLACE FUNCTION create_inventory_row()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

  INSERT INTO inventory (
    product_id
  )
  VALUES (
    NEW.id
  )
  ON CONFLICT (product_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_products_inventory
AFTER INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION create_inventory_row();


-- 9. STOCK HISTORY

CREATE TABLE stock_history (
  id                SERIAL PRIMARY KEY,

  product_id        INT NOT NULL
                    REFERENCES products(id)
                    ON DELETE RESTRICT,

  change_type       stock_change_type NOT NULL,


  qty               INT NOT NULL
                    CHECK (qty > 0),

  previous_stock    INT NOT NULL
                    CHECK (previous_stock >= 0),

  new_stock         INT NOT NULL
                    CHECK (new_stock >= 0),

  source            stock_source NOT NULL,

  reference_id      VARCHAR(64),

  changed_by        INT
                    REFERENCES users(id)
                    ON DELETE SET NULL,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE UNIQUE INDEX uniq_stock_history_ref
ON stock_history (
  source,
  reference_id,
  product_id
)
WHERE reference_id IS NOT NULL;

CREATE INDEX idx_stock_history_product
ON stock_history (product_id);

CREATE INDEX idx_stock_history_created
ON stock_history (created_at DESC);

CREATE INDEX idx_stock_history_source
ON stock_history (source);

CREATE INDEX idx_stock_history_changed_by
ON stock_history (changed_by);


-- 10. APPLY STOCK CHANGE


CREATE OR REPLACE FUNCTION apply_stock_change(
  p_product_id   INT,
  p_qty          INT,
  p_change_type  stock_change_type,
  p_source       stock_source,
  p_reference_id VARCHAR,
  p_changed_by   INT
)
RETURNS TABLE (
  new_stock INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current INT;
  v_new     INT;
  v_exists  BOOLEAN;
BEGIN

  -- Validate product
  SELECT EXISTS (
    SELECT 1
    FROM products
    WHERE id = p_product_id
      AND is_active = TRUE
  )
  INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION
      'PRODUCT_NOT_FOUND_OR_INACTIVE: product %',
      p_product_id;
  END IF;

  -- Validate quantity
  IF p_change_type <> 'adjustment' AND p_qty <= 0 THEN
    RAISE EXCEPTION
      'qty must be positive for %, got %',
      p_change_type,
      p_qty;
  END IF;

  IF p_change_type = 'adjustment' AND p_qty = 0 THEN
    RAISE EXCEPTION
      'Adjustment quantity cannot be zero';
  END IF;

  -- Lock inventory row
  SELECT current_stock
  INTO v_current
  FROM inventory
  WHERE product_id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'No inventory row for product_id %',
      p_product_id;
  END IF;

  -- STOCK OUT
  IF p_change_type = 'out' THEN

    IF v_current < p_qty THEN
      RAISE EXCEPTION
        'INSUFFICIENT_STOCK: product % has % in stock, cannot deduct %',
        p_product_id,
        v_current,
        p_qty;
    END IF;

    v_new := v_current - p_qty;

    UPDATE inventory
    SET
      stock_out = stock_out + p_qty,
      current_stock = v_new
    WHERE product_id = p_product_id;

  -- STOCK IN
  ELSIF p_change_type = 'in' THEN

    v_new := v_current + p_qty;

    UPDATE inventory
    SET
      stock_in = stock_in + p_qty,
      current_stock = v_new
    WHERE product_id = p_product_id;

  -- DAMAGED STOCK
  ELSIF p_change_type = 'damaged' THEN

    IF v_current < p_qty THEN
      RAISE EXCEPTION
        'INSUFFICIENT_STOCK: product % has % in stock, cannot mark % damaged',
        p_product_id,
        v_current,
        p_qty;
    END IF;

    v_new := v_current - p_qty;

    UPDATE inventory
    SET
      damaged_stock = damaged_stock + p_qty,
      current_stock = v_new
    WHERE product_id = p_product_id;

  -- STOCK ADJUSTMENT
  -- Positive: adjustment +5
  -- Negative: adjustment -3
  ELSIF p_change_type = 'adjustment' THEN

    v_new := v_current + p_qty;

    IF v_new < 0 THEN
      RAISE EXCEPTION
        'INVALID_ADJUSTMENT: product % has %, adjustment % would make stock negative',
        p_product_id,
        v_current,
        p_qty;
    END IF;

    UPDATE inventory
    SET
      adjustment_qty = adjustment_qty + p_qty,
      current_stock = v_new
    WHERE product_id = p_product_id;

  END IF;

  -- Record history
  INSERT INTO stock_history (
    product_id,
    change_type,
    qty,
    previous_stock,
    new_stock,
    source,
    reference_id,
    changed_by
  )
  VALUES (
    p_product_id,
    p_change_type,
    CASE
      WHEN p_qty < 0 THEN ABS(p_qty)
      ELSE p_qty
    END,
    v_current,
    v_new,
    p_source,
    p_reference_id,
    p_changed_by
  );

  RETURN QUERY
  SELECT v_new;

END;
$$;


-- 11. LOW STOCK NOTIFICATION

CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_min   INT;
  v_name  VARCHAR(150);
BEGIN

  SELECT
    p.min_stock_level,
    p.name
  INTO
    v_min,
    v_name
  FROM products p
  WHERE p.id = NEW.product_id;

  IF NEW.new_stock <= v_min
     AND NOT EXISTS (
       SELECT 1
       FROM notifications
       WHERE type = 'low_stock'
         AND related_id = NEW.product_id
         AND is_read = FALSE
     )
  THEN

    INSERT INTO notifications (
      type,
      message,
      related_id
    )
    VALUES (
      'low_stock',
      v_name ||
      ' is low in stock (' ||
      NEW.new_stock ||
      ' left, minimum ' ||
      v_min ||
      ')',
      NEW.product_id
    );

  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stock_history_low_stock
AFTER INSERT ON stock_history
FOR EACH ROW
EXECUTE FUNCTION check_low_stock();


-- 12. NOTIFICATIONS

CREATE TABLE notifications (
  id          SERIAL PRIMARY KEY,

  type        notification_type NOT NULL,

  message     VARCHAR(255) NOT NULL
              CHECK (btrim(message) <> ''),

  related_id  INT,

  is_read     BOOLEAN NOT NULL DEFAULT FALSE,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_unread
ON notifications (is_read)
WHERE is_read = FALSE;

CREATE INDEX idx_notifications_created
ON notifications (created_at DESC);


-- 13. ACTIVITY LOG

CREATE TABLE activity_log (
  id           SERIAL PRIMARY KEY,

  user_id      INT NOT NULL
               REFERENCES users(id)
               ON UPDATE CASCADE
               ON DELETE CASCADE,

  action       VARCHAR(255) NOT NULL
               CHECK (btrim(action) <> ''),

  entity_type  VARCHAR(50),

  entity_id    INT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_created
ON activity_log (created_at DESC);

CREATE INDEX idx_activity_log_user
ON activity_log (user_id);

CREATE INDEX idx_activity_log_entity
ON activity_log (entity_type);


