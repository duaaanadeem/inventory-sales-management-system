/**
 * product.inventoryClient.js — Products module's bridge to Ali's
 * Inventory module. Per schema v3: ALL stock changes go through
 * apply_stock_change() — this module never touches the `inventory`
 * table directly, it calls Ali's endpoint instead.
 *
 * Kept in its own file so if Ali's route/payload changes, only this
 * file needs editing (product.service.js just calls recordInitialStock()).
 *
 * !! CONFIRM WITH ALI BEFORE MERGE !!
 * apply_stock_change(product_id, qty, change_type, source, reference_id, changed_by)
 * needs all 6 params, but Ali's message only confirmed field names for
 * PURCHASE stock-in (source='purchase', reference_id=purchase_id, looped
 * per purchase_item). For our own "initial stock on product create" case
 * we are ASSUMING:
 *   change_type = 'in'
 *   source      = 'manual'
 *   reference_id = null   (not tied to a purchase/sale)
 *   changed_by   = null   (no auth/user context yet, see authMiddleware.js)
 * If Ali's endpoint expects different values, update ONLY this file.
 */
const INVENTORY_API_BASE_URL =
  process.env.INVENTORY_API_BASE_URL || "http://localhost:5000";
const STOCK_ENDPOINT_PATH =
  process.env.INVENTORY_STOCK_ENDPOINT_PATH || "/api/inventory/stock-change";

const recordInitialStock = async ({ productId, qty, changedBy = null }) => {
  const url = `${INVENTORY_API_BASE_URL}${STOCK_ENDPOINT_PATH}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: productId,
      qty,
      change_type: "in",
      source: "manual",
      reference_id: null,
      changed_by: changedBy,
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    const error = new Error(
      `Inventory stock-change failed (HTTP ${response.status}): ${bodyText || response.statusText}`
    );
    error.statusCode = 502; // our API is fine, downstream (Ali's module) failed
    throw error;
  }

  return response.json();
};

module.exports = { recordInitialStock };
