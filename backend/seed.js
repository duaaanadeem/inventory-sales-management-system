const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const seedSql = `
-- Insert dummy categories
INSERT INTO categories (name) VALUES ('Electronics'), ('Office Supplies'), ('Furniture') ON CONFLICT DO NOTHING;

-- Insert dummy products
INSERT INTO products (sku, name, category_id, price, cost, min_stock_level) VALUES
('SKU-101', 'Wireless Mouse', 1, 25.99, 10.00, 10),
('SKU-102', 'Ergonomic Keyboard', 1, 75.50, 40.00, 5),
('SKU-201', 'A4 Copy Paper', 2, 5.00, 2.00, 50),
('SKU-301', 'Office Chair', 3, 150.00, 80.00, 2)
ON CONFLICT DO NOTHING;

-- Insert dummy inventory
INSERT INTO inventory (product_id, opening_stock, current_stock) 
SELECT id, 50, 50 FROM products
ON CONFLICT (product_id) DO NOTHING;

-- Insert dummy customers
INSERT INTO customers (name, phone, email, address, total_spending) VALUES
('John Doe', '555-0101', 'john@example.com', '123 Main St', 1250.50),
('Jane Smith', '555-0102', 'jane@example.com', '456 Oak Ave', 890.00),
('Bob Johnson', '555-0103', 'bob@example.com', '789 Pine Rd', 450.25),
('Alice Williams', '555-0104', 'alice@example.com', '321 Elm Blvd', 2100.00)
ON CONFLICT DO NOTHING;

-- Insert dummy suppliers
INSERT INTO suppliers (name, company, phone, email, address) VALUES
('Tech Supplies Co.', 'Tech Supplies Co.', '800-555-1234', 'sales@techsupplies.com', '100 Tech Blvd'),
('Global Office', 'Global Office Inc.', '800-555-9876', 'contact@globaloffice.com', '200 Business Pkwy')
ON CONFLICT DO NOTHING;

-- Link suppliers and products
INSERT INTO supplier_products (supplier_id, product_id)
SELECT s.id, p.id FROM suppliers s, products p 
WHERE s.name = 'Tech Supplies Co.' AND p.name IN ('Wireless Mouse', 'Ergonomic Keyboard')
ON CONFLICT DO NOTHING;

INSERT INTO supplier_products (supplier_id, product_id)
SELECT s.id, p.id FROM suppliers s, products p 
WHERE s.name = 'Global Office' AND p.name IN ('A4 Copy Paper', 'Office Chair')
ON CONFLICT DO NOTHING;

-- Insert dummy users for staff/admin if empty
INSERT INTO users (full_name, email, password_hash, role)
VALUES ('Admin User', 'admin@example.com', '$2b$10$WixWzP/...', 'admin') -- fake hash, can't actually login with it unless reset
ON CONFLICT DO NOTHING;
`;

async function runSeed() {
  try {
    console.log("Seeding database...");
    await pool.query(seedSql);
    console.log("Database seeded successfully.");
  } catch (err) {
    console.error("Error seeding database:", err);
  } finally {
    pool.end();
  }
}

runSeed();
