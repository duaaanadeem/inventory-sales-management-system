const pool = require("../../config/pg-db");
const { stockInManual } = require("../inventory/inventory.service");

const SELECT_FIELDS = `
  p.id, p.sku, p.name, p.category_id, c.name AS category_name,
  p.price, p.cost, p.image_url, p.min_stock_level, p.is_active,
  p.created_at, p.updated_at,
  COALESCE(i.current_stock, 0) AS current_stock
`;

const BASE_JOIN = `
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN inventory i ON i.product_id = p.id
`;

const getAllProducts = async ({ search, categoryId, page = 1, limit = 20 }) => {
  const conditions = ["p.is_active = TRUE"]; // soft-deleted products never listed
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
  }

  if (categoryId) {
    params.push(categoryId);
    conditions.push(`p.category_id = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const offset = (Number(page) - 1) * Number(limit);
  params.push(Number(limit));
  params.push(offset);

  const result = await pool.query(
    `SELECT ${SELECT_FIELDS} ${BASE_JOIN} ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const countParams = params.slice(0, params.length - 2);
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM products p ${whereClause}`,
    countParams
  );

  return { products: result.rows, total: countResult.rows[0].total };
};

// Single product, not paginated
const getProductById = async (id) => {
  const result = await pool.query(
    `SELECT ${SELECT_FIELDS} ${BASE_JOIN} WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const createProduct = async (productData) => {
  const {
    sku, name, categoryId, price, cost, imageUrl,
    minStockLevel = 0, openingStock = 0, changedBy = null,
  } = productData;

  const productResult = await pool.query(
    `INSERT INTO products (sku, name, category_id, price, cost, image_url, min_stock_level)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, sku, name, category_id, price, cost, image_url, min_stock_level, is_active, created_at, updated_at`,
    [sku, name, categoryId || null, price, cost, imageUrl || null, minStockLevel]
  );

  const product = productResult.rows[0];
  let warning = null;

  if (openingStock > 0) {
    try {
      await stockInManual({
        product_id: product.id,
        qty: openingStock,
        changed_by: changedBy,
      });
    } catch (err) {
      console.error(`Initial stock-in failed for product ${product.id}:`, err.message);
      warning =
        "Product created, but setting initial stock failed (Inventory module " +
        "may be unavailable). Current stock is 0 — set it manually via Inventory.";
    }
  }

  // Re-read so current_stock in the response is accurate
  const productWithStock = await getProductById(product.id);
  return warning ? { ...productWithStock, warning } : productWithStock;
};

const updateProduct = async (id, productData) => {
  const fields = [];
  const params = [];
  let index = 1;

  const fieldMap = {
    sku: "sku",
    name: "name",
    categoryId: "category_id",
    price: "price",
    cost: "cost",
    imageUrl: "image_url",
    minStockLevel: "min_stock_level",
  };

  for (const [key, column] of Object.entries(fieldMap)) {
    if (productData[key] !== undefined) {
      fields.push(`${column} = $${index}`);
      params.push(productData[key]);
      index++;
    }
  }

  if (fields.length === 0) {
    const error = new Error("No fields provided to update");
    error.statusCode = 400;
    throw error;
  }

  params.push(id);

  const result = await pool.query(
    `UPDATE products SET ${fields.join(", ")} WHERE id = $${index} AND is_active = TRUE
     RETURNING id, sku, name, category_id, price, cost, image_url, min_stock_level, is_active, created_at, updated_at`,
    params
  );

  return result.rows[0] || null;
};

const softDeleteProduct = async (id) => {
  const result = await pool.query(
    `UPDATE products SET is_active = FALSE WHERE id = $1 AND is_active = TRUE RETURNING id`,
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  softDeleteProduct,
};
