-- Demo categories and products for local development.
-- Safe to run more than once: existing names and SKUs are left unchanged.

INSERT INTO categories (name)
VALUES
  ('Accessories'),
  ('Audio'),
  ('Computer Hardware'),
  ('Networking'),
  ('Office Supplies'),
  ('Storage')
ON CONFLICT (LOWER(name)) DO NOTHING;

INSERT INTO products (sku, name, category_id, price, cost, min_stock_level)
SELECT seed.sku, seed.name, categories.id, seed.price, seed.cost, seed.min_stock_level
FROM (VALUES
  ('ACC-001', 'Wireless Mouse', 'Accessories', 25.99, 14.50, 10),
  ('ACC-002', 'Mechanical Keyboard', 'Accessories', 89.99, 57.00, 5),
  ('AUD-001', 'USB-C Headset', 'Audio', 49.99, 29.00, 8),
  ('HW-001', '27-inch Monitor', 'Computer Hardware', 229.99, 168.00, 4),
  ('NET-001', 'Gigabit Wi-Fi Router', 'Networking', 79.99, 48.00, 6),
  ('OFF-001', 'A4 Copy Paper (500 sheets)', 'Office Supplies', 7.99, 4.25, 20),
  ('STO-001', '1TB Portable SSD', 'Storage', 94.99, 67.00, 5),
  ('STO-002', '128GB USB Flash Drive', 'Storage', 14.99, 7.50, 12)
) AS seed(sku, name, category_name, price, cost, min_stock_level)
JOIN categories ON LOWER(categories.name) = LOWER(seed.category_name)
ON CONFLICT (LOWER(sku)) DO NOTHING;

DO $$
DECLARE
  seeded RECORD;
BEGIN
  FOR seeded IN
    SELECT products.id, products.sku, seed.opening_stock
    FROM (VALUES
      ('ACC-001', 36), ('ACC-002', 15), ('AUD-001', 22), ('HW-001', 7),
      ('NET-001', 12), ('OFF-001', 48), ('STO-001', 9), ('STO-002', 28)
    ) AS seed(sku, opening_stock)
    JOIN products ON products.sku = seed.sku
    WHERE products.is_active = TRUE
  LOOP
    IF seeded.opening_stock > 0 AND NOT EXISTS (
      SELECT 1 FROM stock_history
      WHERE product_id = seeded.id AND reference_id = 'seed:' || seeded.sku
    ) THEN
      PERFORM apply_stock_change(
        seeded.id, seeded.opening_stock, 'in', 'manual', 'seed:' || seeded.sku, NULL
      );
    END IF;
  END LOOP;
END;
$$;
