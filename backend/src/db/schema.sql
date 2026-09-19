-- ============================================================================
-- ENUM TYPES
-- ============================================================================
CREATE TYPE stock_change_type    AS ENUM ('in', 'out', 'damaged', 'adjustment');
CREATE TYPE stock_source         AS ENUM ('sale', 'purchase', 'manual', 'damage_report');
CREATE TYPE notification_type    AS ENUM ('low_stock', 'new_sale', 'purchase_received', 'other');

-- ============================================================================
-- REUSABLE TRIGGER FUNCTION: auto-update `updated_at`
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. INVENTORY MANAGEMENT
-- ============================================================================
CREATE TABLE inventory (
  id                SERIAL PRIMARY KEY,
  product_id        INT NOT NULL UNIQUE REFERENCES products(id),
  opening_stock     INT NOT NULL DEFAULT 0 CHECK (opening_stock >= 0),
  stock_in          INT NOT NULL DEFAULT 0 CHECK (stock_in >= 0),
  stock_out         INT NOT NULL DEFAULT 0 CHECK (stock_out >= 0),
  damaged_stock     INT NOT NULL DEFAULT 0 CHECK (damaged_stock >= 0),
  adjustment_qty    INT NOT NULL DEFAULT 0,
  current_stock     INT NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE stock_history (
  id                SERIAL PRIMARY KEY,
  product_id        INT NOT NULL REFERENCES products(id),
  change_type       stock_change_type NOT NULL,
  qty               INT NOT NULL CHECK (qty > 0),
  previous_stock    INT NOT NULL,
  new_stock         INT NOT NULL,
  source            stock_source NOT NULL,
  reference_id      VARCHAR(64),
  changed_by        INT REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_stock_history_ref
  ON stock_history (source, reference_id)
  WHERE reference_id IS NOT NULL;

CREATE INDEX idx_stock_history_product ON stock_history (product_id);
CREATE INDEX idx_stock_history_created ON stock_history (created_at);

-- ----------------------------------------------------------------------------
-- FUNCTION: apply_stock_change
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
    v_new := v_current + p_qty;
    UPDATE inventory SET adjustment_qty = adjustment_qty + p_qty, current_stock = v_new
      WHERE product_id = p_product_id;
  END IF;

  INSERT INTO stock_history
    (product_id, change_type, qty, previous_stock, new_stock, source, reference_id, changed_by)
  VALUES
    (p_product_id, p_change_type, p_qty, v_current, v_new, p_source, p_reference_id, p_changed_by);

  RETURN QUERY SELECT v_new;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- TRIGGER: check_low_stock
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
