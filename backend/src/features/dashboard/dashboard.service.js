const pool = require("../../config/pg-db");

async function getDashboardStats() {
  const result = await pool.query(`
    SELECT
      COALESCE(
        SUM(
          CASE
            WHEN status = 'completed' THEN total
            ELSE 0
          END
        ),
        0
      ) AS total_sales,

      COALESCE(
        SUM(
          CASE
            WHEN status = 'completed'
              AND created_at >= CURRENT_DATE
              AND created_at < CURRENT_DATE + INTERVAL '1 day'
            THEN total
            ELSE 0
          END
        ),
        0
      ) AS todays_sales,

      COALESCE(
        SUM(
          CASE
            WHEN status = 'completed'
              AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
              AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
            THEN total
            ELSE 0
          END
        ),
        0
      ) AS monthly_revenue,

      COUNT(*) FILTER (
        WHERE status = 'pending'
      ) AS pending_orders,

      (
        SELECT COUNT(*)
        FROM products
        WHERE is_active = true
      ) AS total_products,

      (
        SELECT COUNT(*)
        FROM inventory i
        JOIN products p
          ON p.id = i.product_id
        WHERE i.current_stock <= p.min_stock_level
          AND p.is_active = true
      ) AS low_stock_products,

     (
  SELECT COUNT(*)
  FROM customers
  WHERE is_active = true
) AS total_customers

    FROM sales;
  `);

  return result.rows[0];
}
async function getRevenueByCategory() {
  const result = await pool.query(`
    SELECT
      c.id,
      c.name,
      COALESCE(SUM(si.line_total), 0) AS revenue
    FROM sales s
    JOIN sale_items si
      ON si.sale_id = s.id
    JOIN products p
      ON p.id = si.product_id
    JOIN categories c
      ON c.id = p.category_id
    WHERE s.status = 'completed'
    GROUP BY c.id, c.name
    ORDER BY revenue DESC;
  `);

  return result.rows;
}

async function getDailySales() {
  const result = await pool.query(`
    SELECT
      DATE(created_at) AS sale_date,
      COUNT(*) AS number_of_sales,
      COALESCE(SUM(total), 0) AS revenue
    FROM sales
    WHERE status = 'completed'
      AND created_at >= CURRENT_DATE - INTERVAL '6 days'
      AND created_at < CURRENT_DATE + INTERVAL '1 day'
    GROUP BY DATE(created_at)
    ORDER BY sale_date ASC;
  `);

  return result.rows;
}

async function getTopProducts() {
  const result = await pool.query(`
    SELECT
      p.id,
      p.name,
      p.sku,
      COALESCE(SUM(si.quantity), 0) AS total_quantity,
      COALESCE(SUM(si.line_total), 0) AS revenue
    FROM sale_items si
    JOIN sales s
      ON s.id = si.sale_id
    JOIN products p
      ON p.id = si.product_id
    WHERE s.status = 'completed'
    GROUP BY p.id, p.name, p.sku
    ORDER BY total_quantity DESC
    LIMIT 5;
  `);

  return result.rows;
}

module.exports = {
  getDashboardStats,
  getRevenueByCategory,
  getDailySales,
  getTopProducts,
};