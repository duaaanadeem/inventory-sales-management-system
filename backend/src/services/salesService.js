const crypto = require("crypto");
const { query, withTransaction } = require("../config/db");
const { calculateTotals } = require("../utils/salesCalculations");

const taxRate = process.env.TAX_RATE || "0";



// Get products by search query (name or SKU)
const getProducts = async (search) => {
  const value = String(search || "").trim();
  const result = await query(
    `SELECT id, sku, name, price, image_url
     FROM products
     WHERE is_active = TRUE
       AND ($1 = '' OR name ILIKE '%' || $1 || '%' OR sku ILIKE '%' || $1 || '%')
     ORDER BY name
     LIMIT 50`,
    [value]
  );
  return result.rows;
};

// Complete a sale
const completeSale = async ({ customerId, paymentMethod, items, discount, staffId }) => {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("At least one sale item is required");
    error.statusCode = 400;
    throw error;
  }

  if (!['cash', 'card', 'online'].includes(paymentMethod)) {
    const error = new Error("Invalid payment method");
    error.statusCode = 400;
    throw error;
  }

  return withTransaction(async (client) => {
    const productIds = items.map((item) => item.productId);
    if (productIds.some((id) => !Number.isInteger(Number(id)))) {
      const error = new Error("Invalid product id");
      error.statusCode = 400;
      throw error;
    }
    if (new Set(productIds.map(Number)).size !== productIds.length) {
      const error = new Error("Each product may appear only once in a sale");
      error.statusCode = 400;
      throw error;
    }

    const productsResult = await client.query(
      `SELECT p.id, p.sku, p.name, p.price, p.category_id,
              c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = TRUE AND p.id = ANY($1::int[])`,
      [productIds.map(Number)]
    );
    const products = new Map(productsResult.rows.map((product) => [product.id, product]));

    const saleItems = items.map((item) => {
      const product = products.get(Number(item.productId));
      const quantity = Number(item.quantity);
      if (!product) {
        const error = new Error(`Product ${item.productId} not found`);
        error.statusCode = 404;
        throw error;
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        const error = new Error("Item quantities must be positive integers");
        error.statusCode = 400;
        throw error;
      }
      return {
        productId: product.id,
        name: product.name,
        categoryId: product.category_id,
        categoryName: product.category_name,
        quantity,
        unitPrice: product.price
      };
    });

    // Calculate the totals for the sale
    const totals = calculateTotals(saleItems, discount, taxRate);
    const saleResult = await client.query(
      `INSERT INTO sales
       (customer_id, staff_id, subtotal, discount, tax, total, payment_method, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')
       RETURNING id, created_at`,
      [customerId || null, staffId, totals.subtotal, totals.discount, totals.tax, totals.total, paymentMethod]
    );
    const sale = saleResult.rows[0];

    for (const item of saleItems) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5)`,
        [sale.id, item.productId, item.quantity, item.unitPrice, (Math.round(Number(item.unitPrice) * 100) * item.quantity / 100).toFixed(2)]
      );
      await client.query(
        `SELECT * FROM apply_stock_change($1, $2, 'out', 'sale', $3, $4)`,
        [item.productId, item.quantity, String(sale.id), staffId]
      );
    }

    const invoiceNumber = `INV-${sale.id}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const invoiceResult = await client.query(
      `INSERT INTO invoices (sale_id, invoice_number)
       VALUES ($1, $2)
       RETURNING id, invoice_number, created_at`,
      [sale.id, invoiceNumber]
    );

    return { sale, totals, items: saleItems, invoice: invoiceResult.rows[0] };
  });
};

// List all sales
const listSales = async () => {
  const result = await query(
        `SELECT s.id, s.customer_id, c.name AS customer_name, s.staff_id,
            s.subtotal, s.discount, s.tax, s.total, s.payment_method,
          s.status, s.created_at, i.invoice_number,
          COALESCE(SUM(si.quantity), 0)::int AS item_count,
          COALESCE(SUM(si.line_total), 0)::numeric(12,2) AS item_revenue
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     LEFT JOIN invoices i ON i.sale_id = s.id
         LEFT JOIN sale_items si ON si.sale_id = s.id
         GROUP BY s.id, c.name, i.invoice_number
     ORDER BY s.created_at DESC`
  );
  return result.rows;
};

// Get a specific sale by ID
const getSale = async (saleId) => {
  const saleResult = await query(
    `SELECT s.id, s.customer_id, c.name AS customer_name, s.staff_id,
            s.subtotal, s.discount, s.tax, s.total, s.payment_method,
            s.status, s.created_at, i.id AS invoice_id, i.invoice_number, i.pdf_url
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     LEFT JOIN invoices i ON i.sale_id = s.id
     WHERE s.id = $1`,
    [saleId]
  );
  if (saleResult.rowCount === 0) {
    const error = new Error("Sale not found");
    error.statusCode = 404;
    throw error;
  }

  const itemsResult = await query(
        `SELECT si.id, si.product_id, p.name, p.sku, p.category_id,
          cat.name AS category_name, si.quantity,
            si.unit_price, si.line_total
     FROM sale_items si
     JOIN products p ON p.id = si.product_id
         LEFT JOIN categories cat ON cat.id = p.category_id
     WHERE si.sale_id = $1
     ORDER BY si.id`,
    [saleId]
  );

  return { ...saleResult.rows[0], items: itemsResult.rows };
};

// Get the invoice for a specific sale by ID
const getInvoice = async (saleId) => {
  const sale = await getSale(saleId);
  return {
    invoice: {
      id: sale.invoice_id,
      invoiceNumber: sale.invoice_number,
      pdfUrl: sale.pdf_url,
      createdAt: sale.created_at
    },
    sale
  };
};

module.exports = { getProducts, completeSale, listSales, getSale, getInvoice };
