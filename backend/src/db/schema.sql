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


-- 8. NOTIFICATIONS


CREATE TABLE notifications (
  id          SERIAL PRIMARY KEY,

  type        notification_type NOT NULL,

  message     VARCHAR(255) NOT NULL,

  related_id  INT,

  is_read     BOOLEAN NOT NULL DEFAULT FALSE,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_created
ON notifications (created_at DESC);

CREATE INDEX idx_notifications_unread
ON notifications (is_read, created_at DESC)
WHERE is_read = FALSE;

CREATE INDEX idx_notifications_type_related
ON notifications (type, related_id);


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


-- 12. CUSTOMERS

CREATE TABLE customers (
  id              SERIAL PRIMARY KEY,

  name            VARCHAR(100) NOT NULL
                  CHECK (btrim(name) <> ''),

  phone           VARCHAR(30),

  email           VARCHAR(150),

  address         VARCHAR(255),

  total_spending  NUMERIC(14,2) NOT NULL DEFAULT 0
                  CHECK (total_spending >= 0),

  is_active       BOOLEAN NOT NULL DEFAULT TRUE,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_name
ON customers (name);

CREATE INDEX idx_customers_name_trgm
ON customers USING gin (name gin_trgm_ops);

CREATE INDEX idx_customers_phone_trgm
ON customers USING gin (phone gin_trgm_ops);

CREATE INDEX idx_customers_email_trgm
ON customers USING gin (email gin_trgm_ops);

CREATE INDEX idx_customers_created
ON customers (created_at DESC);

CREATE UNIQUE INDEX uniq_customers_email
ON customers (LOWER(email))
WHERE email IS NOT NULL
  AND btrim(email) <> ''
  AND is_active = TRUE;

CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- 13. SALES

CREATE TABLE sales (
  id              SERIAL PRIMARY KEY,

  customer_id     INT
                  REFERENCES customers(id)
                  ON DELETE SET NULL,

  staff_id        INT NOT NULL
                  REFERENCES users(id)
                  ON DELETE RESTRICT,

  subtotal        NUMERIC(14,2) NOT NULL
                  CHECK (subtotal >= 0),

  discount        NUMERIC(14,2) NOT NULL DEFAULT 0
                  CHECK (discount >= 0),

  tax             NUMERIC(14,2) NOT NULL DEFAULT 0
                  CHECK (tax >= 0),

  total           NUMERIC(14,2) NOT NULL
                  CHECK (total >= 0),

  payment_method  payment_method_type NOT NULL,

  status          sale_status_type NOT NULL DEFAULT 'pending',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (
    discount <= subtotal
  ),

  CHECK (
    total = ROUND(subtotal - discount + tax, 2)
  )
);

CREATE INDEX idx_sales_status
ON sales (status);

CREATE INDEX idx_sales_payment
ON sales (payment_method);

CREATE INDEX idx_sales_created
ON sales (created_at DESC);

CREATE INDEX idx_sales_customer
ON sales (customer_id, created_at DESC);

CREATE INDEX idx_sales_staff
ON sales (staff_id);

CREATE TRIGGER trg_sales_updated_at
BEFORE UPDATE ON sales
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- 14. SALE ITEMS

CREATE TABLE sale_items (
  id          SERIAL PRIMARY KEY,

  sale_id     INT NOT NULL
              REFERENCES sales(id)
              ON DELETE CASCADE,

  product_id  INT NOT NULL
              REFERENCES products(id)
              ON DELETE RESTRICT,

  quantity    INT NOT NULL
              CHECK (quantity > 0),

  unit_price  NUMERIC(12,2) NOT NULL
              CHECK (unit_price >= 0),

  line_total  NUMERIC(14,2) NOT NULL
              CHECK (line_total >= 0),

  CHECK (
    line_total = ROUND(quantity * unit_price, 2)
  )
);

CREATE INDEX idx_sale_items_sale
ON sale_items (sale_id);

CREATE INDEX idx_sale_items_product
ON sale_items (product_id);


-- 15. SALE TOTAL VALIDATION FUNCTION

CREATE OR REPLACE FUNCTION validate_sale_total(
  p_sale_id INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_subtotal NUMERIC(14,2);
  v_discount NUMERIC(14,2);
  v_tax      NUMERIC(14,2);
  v_total    NUMERIC(14,2);
  v_items    NUMERIC(14,2);
BEGIN

  SELECT
    subtotal,
    discount,
    tax,
    total
  INTO
    v_subtotal,
    v_discount,
    v_tax,
    v_total
  FROM sales
  WHERE id = p_sale_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'SALE_NOT_FOUND: %',
      p_sale_id;
  END IF;

  SELECT COALESCE(
    SUM(line_total),
    0
  )
  INTO v_items
  FROM sale_items
  WHERE sale_id = p_sale_id;

  IF ROUND(v_items, 2) <> ROUND(v_subtotal, 2) THEN
    RAISE EXCEPTION
      'SALE_SUBTOTAL_MISMATCH: sale %, expected %, received %',
      p_sale_id,
      v_items,
      v_subtotal;
  END IF;

  IF ROUND(v_total, 2)
     <> ROUND(v_subtotal - v_discount + v_tax, 2)
  THEN
    RAISE EXCEPTION
      'SALE_TOTAL_MISMATCH: sale %',
      p_sale_id;
  END IF;

END;
$$;


-- 16. INVOICES

CREATE TABLE invoices (
  id              SERIAL PRIMARY KEY,

  sale_id         INT NOT NULL UNIQUE
                  REFERENCES sales(id)
                  ON DELETE CASCADE,

  invoice_number  VARCHAR(32) NOT NULL UNIQUE,

  pdf_url         VARCHAR(500),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_created
ON invoices (created_at DESC);


-- 17. CUSTOMER SPENDING

CREATE OR REPLACE FUNCTION update_customer_spending()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

  -- Remove OLD completed contribution
  IF TG_OP IN ('UPDATE', 'DELETE') THEN

    IF OLD.customer_id IS NOT NULL
       AND OLD.status = 'completed'
    THEN

      UPDATE customers
      SET total_spending =
        GREATEST(
          0,
          total_spending - OLD.total
        )
      WHERE id = OLD.customer_id;

    END IF;

  END IF;

  -- Add NEW completed contribution
  IF TG_OP IN ('INSERT', 'UPDATE') THEN

    IF NEW.customer_id IS NOT NULL
       AND NEW.status = 'completed'
    THEN

      UPDATE customers
      SET total_spending =
        total_spending + NEW.total
      WHERE id = NEW.customer_id;

    END IF;

  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sales_customer_spending
AFTER INSERT OR DELETE OR UPDATE OF status, total, customer_id
ON sales
FOR EACH ROW
EXECUTE FUNCTION update_customer_spending();


-- 18. SUPPLIERS

CREATE TABLE suppliers (
  id          SERIAL PRIMARY KEY,

  name        VARCHAR(100) NOT NULL
              CHECK (btrim(name) <> ''),

  company     VARCHAR(100),

  phone       VARCHAR(30),

  email       VARCHAR(150),

  address     VARCHAR(255),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_name
ON suppliers (name);

CREATE INDEX idx_suppliers_name_trgm
ON suppliers USING gin (name gin_trgm_ops);

CREATE INDEX idx_suppliers_email_trgm
ON suppliers USING gin (email gin_trgm_ops);

CREATE TRIGGER trg_suppliers_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- 19. SUPPLIER PRODUCTS

CREATE TABLE supplier_products (
  id           SERIAL PRIMARY KEY,

  supplier_id  INT NOT NULL
               REFERENCES suppliers(id)
               ON DELETE CASCADE,

  product_id   INT NOT NULL
               REFERENCES products(id)
               ON DELETE RESTRICT,

  UNIQUE (
    supplier_id,
    product_id
  )
);

CREATE INDEX idx_supplier_products_supplier
ON supplier_products (supplier_id);

CREATE INDEX idx_supplier_products_product
ON supplier_products (product_id);


-- 20. PURCHASES

CREATE TABLE purchases (
  id              SERIAL PRIMARY KEY,

  supplier_id     INT NOT NULL
                  REFERENCES suppliers(id)
                  ON DELETE RESTRICT,

  purchase_date   DATE NOT NULL DEFAULT CURRENT_DATE,

  payment_status  payment_status_type NOT NULL DEFAULT 'unpaid',

  status          purchase_status_type NOT NULL DEFAULT 'pending',

  total_cost      NUMERIC(14,2) NOT NULL
                  CHECK (total_cost >= 0),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchases_status
ON purchases (status);

CREATE INDEX idx_purchases_supplier
ON purchases (supplier_id);

CREATE INDEX idx_purchases_date
ON purchases (purchase_date DESC);

CREATE TRIGGER trg_purchases_updated_at
BEFORE UPDATE ON purchases
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- 21. PURCHASE ITEMS

CREATE TABLE purchase_items (
  id            SERIAL PRIMARY KEY,

  purchase_id   INT NOT NULL
                REFERENCES purchases(id)
                ON DELETE CASCADE,

  product_id    INT NOT NULL
                REFERENCES products(id)
                ON DELETE RESTRICT,

  quantity      INT NOT NULL
                CHECK (quantity > 0),

  cost          NUMERIC(12,2) NOT NULL
                CHECK (cost >= 0),

  line_total    NUMERIC(14,2)
                GENERATED ALWAYS AS
                (ROUND(quantity * cost, 2))
                STORED
);

CREATE INDEX idx_purchase_items_purchase
ON purchase_items (purchase_id);

CREATE INDEX idx_purchase_items_product
ON purchase_items (product_id);


-- 22. PURCHASE TOTAL VALIDATION

CREATE OR REPLACE FUNCTION validate_purchase_total(
  p_purchase_id INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_expected NUMERIC(14,2);
  v_received NUMERIC(14,2);
BEGIN

  SELECT COALESCE(
    SUM(line_total),
    0
  )
  INTO v_expected
  FROM purchase_items
  WHERE purchase_id = p_purchase_id;

  SELECT total_cost
  INTO v_received
  FROM purchases
  WHERE id = p_purchase_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'PURCHASE_NOT_FOUND: %',
      p_purchase_id;
  END IF;

  IF ROUND(v_expected, 2)
     <> ROUND(v_received, 2)
  THEN
    RAISE EXCEPTION
      'PURCHASE_TOTAL_MISMATCH: purchase %, expected %, received %',
      p_purchase_id,
      v_expected,
      v_received;
  END IF;

END;
$$;


-- 23. ACTIVITY LOG

CREATE TABLE activity_log (
  id           SERIAL PRIMARY KEY,

  user_id      INT
               REFERENCES users(id)
               ON DELETE SET NULL,

  action       VARCHAR(255) NOT NULL,

  entity_type  VARCHAR(50),

  entity_id    INT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_created
ON activity_log (created_at DESC);

CREATE INDEX idx_activity_log_user
ON activity_log (user_id);

CREATE INDEX idx_activity_log_entity
ON activity_log (entity_type, entity_id);


-- 24. NEW SALE NOTIFICATION

CREATE OR REPLACE FUNCTION create_sale_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

  IF NEW.status = 'completed'
     AND (
       TG_OP = 'INSERT'
       OR OLD.status IS DISTINCT FROM NEW.status
     )
  THEN

    INSERT INTO notifications (
      type,
      message,
      related_id
    )
    VALUES (
      'new_sale',
      'Sale #' || NEW.id || ' completed.',
      NEW.id
    );

  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sale_notification
AFTER INSERT OR UPDATE OF status
ON sales
FOR EACH ROW
EXECUTE FUNCTION create_sale_notification();


-- 25. PURCHASE RECEIVED NOTIFICATION

CREATE OR REPLACE FUNCTION create_purchase_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

  IF NEW.status = 'completed'
     AND (
       TG_OP = 'INSERT'
       OR OLD.status IS DISTINCT FROM NEW.status
     )
  THEN

    INSERT INTO notifications (
      type,
      message,
      related_id
    )
    VALUES (
      'purchase_received',
      'Purchase #' || NEW.id || ' received.',
      NEW.id
    );

  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_purchase_notification
AFTER INSERT OR UPDATE OF status
ON purchases
FOR EACH ROW
EXECUTE FUNCTION create_purchase_notification();


-- 26. REPORTS

-- DAILY SALES
CREATE OR REPLACE VIEW v_daily_sales AS
SELECT
  DATE(created_at) AS sale_date,
  COUNT(*) AS num_sales,
  SUM(subtotal) AS subtotal,
  SUM(discount) AS discount,
  SUM(tax) AS tax,
  SUM(total) AS revenue
FROM sales
WHERE status = 'completed'
GROUP BY DATE(created_at);

-- MONTHLY SALES
CREATE OR REPLACE VIEW v_monthly_sales AS
SELECT
  DATE_TRUNC('month', created_at)::DATE AS month,
  COUNT(*) AS num_sales,
  SUM(total) AS revenue
FROM sales
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', created_at);

-- PRODUCT SALES
CREATE OR REPLACE VIEW v_product_sales AS
SELECT
  p.id AS product_id,
  p.sku,
  p.name AS product_name,
  COALESCE(
    SUM(
      CASE
        WHEN s.status = 'completed'
        THEN si.quantity
        ELSE 0
      END
    ),
    0
  ) AS units_sold,
  COALESCE(
    SUM(
      CASE
        WHEN s.status = 'completed'
        THEN si.line_total
        ELSE 0
      END
    ),
    0
  ) AS revenue
FROM products p
LEFT JOIN sale_items si
  ON si.product_id = p.id
LEFT JOIN sales s
  ON s.id = si.sale_id
GROUP BY
  p.id,
  p.sku,
  p.name;

-- TOP SELLING PRODUCTS
CREATE OR REPLACE VIEW v_top_selling_products AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.sku,
  SUM(si.quantity) AS units_sold,
  SUM(si.line_total) AS revenue
FROM sale_items si
JOIN sales s
  ON s.id = si.sale_id
JOIN products p
  ON p.id = si.product_id
WHERE s.status = 'completed'
GROUP BY
  p.id,
  p.name,
  p.sku;

-- REVENUE BY CATEGORY
CREATE OR REPLACE VIEW v_revenue_by_category AS
SELECT
  c.id AS category_id,
  c.name AS category_name,
  COALESCE(
    SUM(si.line_total),
    0
  ) AS revenue
FROM categories c
LEFT JOIN products p
  ON p.category_id = c.id
LEFT JOIN sale_items si
  ON si.product_id = p.id
LEFT JOIN sales s
  ON s.id = si.sale_id
  AND s.status = 'completed'
GROUP BY
  c.id,
  c.name;

-- CURRENT INVENTORY
CREATE OR REPLACE VIEW v_inventory_report AS
SELECT
  p.id AS product_id,
  p.sku,
  p.name AS product_name,
  c.name AS category,
  i.opening_stock,
  i.stock_in,
  i.stock_out,
  i.damaged_stock,
  i.adjustment_qty,
  i.current_stock,
  p.min_stock_level,
  CASE
    WHEN i.current_stock <= p.min_stock_level
    THEN TRUE
    ELSE FALSE
  END AS is_low_stock
FROM products p
JOIN inventory i
  ON i.product_id = p.id
LEFT JOIN categories c
  ON c.id = p.category_id;

-- CUSTOMER REPORT
CREATE OR REPLACE VIEW v_customer_report AS
SELECT
  c.id,
  c.name,
  c.phone,
  c.email,
  c.total_spending,
  COUNT(
    s.id
  ) FILTER (
    WHERE s.status = 'completed'
  ) AS completed_orders
FROM customers c
LEFT JOIN sales s
  ON s.customer_id = c.id
WHERE c.is_active = TRUE
GROUP BY
  c.id,
  c.name,
  c.phone,
  c.email,
  c.total_spending;

-- SUPPLIER PURCHASE REPORT
CREATE OR REPLACE VIEW v_supplier_purchase_report AS
SELECT
  sp.id AS supplier_id,
  sp.name AS supplier_name,
  COUNT(p.id) FILTER (
    WHERE p.status = 'completed'
  ) AS completed_purchases,
  COALESCE(
    SUM(
      CASE
        WHEN p.status = 'completed'
        THEN p.total_cost
        ELSE 0
      END
    ),
    0
  ) AS total_purchase_cost
FROM suppliers sp
LEFT JOIN purchases p
  ON p.supplier_id = sp.id
GROUP BY
  sp.id,
  sp.name;

-- PROFIT REPORT
-- Profit = sale revenue - product cost
-- Based on product cost at the time the report is calculated.
-- For historically exact profit, store unit_cost on sale_items at sale time.
CREATE OR REPLACE VIEW v_profit_report AS
SELECT
  DATE(s.created_at) AS sale_date,
  SUM(si.line_total) AS revenue,
  SUM(
    si.quantity * p.cost
  ) AS estimated_cost,
  SUM(si.line_total)
  -
  SUM(si.quantity * p.cost)
  AS estimated_profit
FROM sales s
JOIN sale_items si
  ON si.sale_id = s.id
JOIN products p
  ON p.id = si.product_id
WHERE s.status = 'completed'
GROUP BY
  DATE(s.created_at);


-- 27. DASHBOARD SUMMARY VIEW

CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
  (
    SELECT COALESCE(
      SUM(total),
      0
    )
    FROM sales
    WHERE status = 'completed'
  ) AS total_sales,

  (
    SELECT COALESCE(
      SUM(total),
      0
    )
    FROM sales
    WHERE status = 'completed'
      AND created_at >= CURRENT_DATE
  ) AS todays_sales,

  (
    SELECT COUNT(*)
    FROM products
    WHERE is_active = TRUE
  ) AS total_products,

  (
    SELECT COUNT(*)
    FROM inventory i
    JOIN products p
      ON p.id = i.product_id
    WHERE p.is_active = TRUE
      AND i.current_stock <= p.min_stock_level
  ) AS low_stock_products,

  (
    SELECT COUNT(*)
    FROM customers
    WHERE is_active = TRUE
  ) AS total_customers,

  (
    SELECT COUNT(*)
    FROM sales
    WHERE status = 'pending'
  ) AS pending_orders,

  (
    SELECT COALESCE(
      SUM(total),
      0
    )
    FROM sales
    WHERE status = 'completed'
      AND created_at >= DATE_TRUNC(
        'month',
        CURRENT_DATE
      )
  ) AS monthly_revenue;


-- 28. SEARCH / FILTER INDEXES

CREATE INDEX idx_sales_created_status
ON sales (created_at DESC, status);

CREATE INDEX idx_sales_payment_created
ON sales (payment_method, created_at DESC);

CREATE INDEX idx_purchases_supplier_date
ON purchases (supplier_id, purchase_date DESC);

CREATE INDEX idx_purchase_items_product_purchase
ON purchase_items (product_id, purchase_id);

CREATE INDEX idx_stock_history_product_created
ON stock_history (product_id, created_at DESC);


-- 29. COMMENTS / DOCUMENTATION

COMMENT ON TABLE users IS
'Admin and staff accounts. Role-based permissions are enforced by backend middleware.';

COMMENT ON TABLE products IS
'Product master data. Current stock is stored ONLY in inventory.current_stock.';

COMMENT ON TABLE inventory IS
'Single source of truth for current stock quantity.';

COMMENT ON TABLE stock_history IS
'Immutable audit trail of all inventory changes.';

COMMENT ON FUNCTION apply_stock_change IS
'Central transaction-safe function for stock in/out/damaged/adjustment operations. Adjustment accepts positive or negative quantity.';

COMMENT ON TABLE sales IS
'Sales/POS header table. Sale items are stored separately.';

COMMENT ON TABLE sale_items IS
'Products and quantities belonging to each sale.';

COMMENT ON TABLE purchases IS
'Purchase order/receipt header.';

COMMENT ON TABLE purchase_items IS
'Products and quantities belonging to each purchase.';

COMMENT ON TABLE activity_log IS
'Audit trail of important user actions.';

