/**
 * product.service.js — DB layer for Products. No req/res here, so this
 * logic is reusable (e.g. a future CSV bulk-import feature could call
 * createProduct() directly).
 *
 * Schema v3 rule: stock is NEVER stored/changed here. The `inventory`
 * row is auto-created by a DB trigger right after INSERT into products.
 * Initial stock (if any) goes through product.inventoryClient.js.
 */
const { query } = require("../../config/db");
const inventoryClient = require("./product.inventoryClient");

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

/**
 * getAllProducts — list with search/category filter + pagination.
 * Response fields match what Dashboard/Low-stock teammates were given:
 * id, name, image_url, category_id, category_name, current_stock
 * (plus extra fields other consumers may want — a superset, not a
 * breaking change).
 */
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

  const result = await query(
    `SELECT ${SELECT_FIELDS} ${BASE_JOIN} ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const countParams = params.slice(0, params.length - 2);
  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM products p ${whereClause}`,
    countParams
  );

  return { products: result.rows, total: countResult.rows[0].total };
};

// GET /api/products/:id — used by teammates one product_id at a time (not paginated)
const getProductById = async (id) => {
  const result = await query(
    `SELECT ${SELECT_FIELDS} ${BASE_JOIN} WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * createProduct — inserts into products only; inventory row auto-created
 * by trigger. If openingStock > 0, asks Ali's module to record it via
 * apply_stock_change(). That call failing does NOT roll back the product
 * (it's a separate HTTP call, not part of this DB transaction) — instead
 * we return a warning so the frontend can tell the user stock is still 0.
 */
const createProduct = async (productData) => {
  const {
    sku, name, categoryId, price, cost, imageUrl,
    minStockLevel = 0, openingStock = 0, changedBy = null,
  } = productData;

  const productResult = await query(
    `INSERT INTO products (sku, name, category_id, price, cost, image_url, min_stock_level)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, sku, name, category_id, price, cost, image_url, min_stock_level, is_active, created_at, updated_at`,
    [sku, name, categoryId || null, price, cost, imageUrl || null, minStockLevel]
  );

  const product = productResult.rows[0];
  let warning = null;

  if (openingStock > 0) {
    try {
      await inventoryClient.recordInitialStock({
        productId: product.id,
        qty: openingStock,
        changedBy,
      });
    } catch (err) {
      console.error(`Initial stock-in failed for product ${product.id}:`, err.message);
      warning =
        "Product created, but setting initial stock failed (Inventory module " +
        "may be unavailable). Current stock is 0 — set it manually via Inventory.";
    }
  }

  // Always read current_stock back from DB so the response is truthful
  // whether the stock-in call above succeeded or not.
  const productWithStock = await getProductById(product.id);
  return warning ? { ...productWithStock, warning } : productWithStock;
};

/**
 * updateProduct — partial update (only fields actually sent get changed).
 * Never touches stock — that's exclusively Ali's apply_stock_change().
 */
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

  const result = await query(
    `UPDATE products SET ${fields.join(", ")} WHERE id = $${index} AND is_active = TRUE
     RETURNING id, sku, name, category_id, price, cost, image_url, min_stock_level, is_active, created_at, updated_at`,
    params
  );

  return result.rows[0] || null;
};

/**
 * softDeleteProduct — sets is_active = FALSE instead of a hard DELETE.
 * Hard delete would break FK references in sale_items/purchase_items
 * (ON DELETE RESTRICT in schema v3) and destroy sales history.
 */
const softDeleteProduct = async (id) => {
  const result = await query(
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
