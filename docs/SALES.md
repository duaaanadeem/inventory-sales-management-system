# Sales / POS Module

## Structure

Feature-based layout, matching Ali's inventory module so both merge cleanly:

```
backend/src/features/sales/
  sales.routes.js        route table + middleware chain
  sales.controller.js    thin handlers, maps errors to HTTP via utils/response
  sales.service.js       queries and the checkout transaction
  sales.validation.js    request validation middleware
  sales.calculations.js  pure money math (integer cents)
```

Shared files (`src/config/db.js`, `src/utils/response.js`) are kept identical
to the inventory module. Do not fork them — that is what caused the earlier
merge conflict.

## Configuration

`backend/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/inventory_sales
JWT_SECRET=the-shared-auth-secret
TAX_RATE=0
```

`TAX_RATE=0` is temporary until the team confirms the business tax rule.

## Authentication

Protected routes expect the shared team's JWT:

```http
Authorization: Bearer <token>
```

The token payload must carry a user identifier in `id`, `userId`, or `sub`.
That identifier becomes `sales.staff_id`. `POST /api/sales` additionally
requires the `admin` or `staff` role.

`GET /api/sales/products/search` is currently unauthenticated so the POS can
load the product list before login. Move it behind `authenticateUser` once the
frontend flow is settled.

## API

| Method | Path                             | Auth  | Description                        |
| ------ | -------------------------------- | ----- | ---------------------------------- |
| GET    | `/api/sales/products/search?q=`  | none  | Search active products by name/SKU |
| POST   | `/api/sales`                     | staff | Complete a sale                    |
| GET    | `/api/sales`                     | user  | Sales history                      |
| GET    | `/api/sales/:id`                 | user  | Sale detail with item snapshots    |
| GET    | `/api/sales/:id/invoice`         | user  | Invoice data for a sale            |

Responses use the shared helper in `src/utils/response.js`:

```json
{ "success": true, "data": {} }
{ "success": false, "error": "message" }
```

Error codes: `400` invalid input, `403` staff role required, `404` unknown
sale or product, `409` insufficient stock or a database constraint violation,
`500` unexpected.

## Checkout

`POST /api/sales` runs in one transaction on a single pooled connection
(`pool.connect()`, then `BEGIN` / `COMMIT` / `ROLLBACK`, mirroring the
inventory module). It:

1. reads prices from the `products` table — the request body never supplies them
2. stores a `sale_items.unit_price` snapshot, so past totals survive price changes
3. calls `apply_stock_change(..., 'out', 'sale', saleId, staffId)` per line
4. creates the invoice

Any failure rolls the entire sale back, including the stock deductions.

### Idempotency note

All lines of one sale share `source = 'sale'` and `reference_id = <saleId>`.
The unique index on `stock_history` must therefore be:

```sql
CREATE UNIQUE INDEX uniq_stock_history_ref
  ON stock_history (source, reference_id, product_id)
  WHERE reference_id IS NOT NULL;
```

Omitting `product_id` makes the second line of any multi-item sale fail with a
unique violation. This is the form in Ali's `src/db/schema.sql` and in
`docs/FULL_PROJECT_SCHEMA.sql`.

## Not implemented yet

- `GET /pos/` — `docs/` previously pointed at a POS page. There is no
  `backend/public` directory and no `express.static` mount.
- Seed script — no `scripts/seedDemoData.js`; the `seed:demo` npm script was
  removed rather than left pointing at a missing file.
- Automated tests — `npm test` runs `node --test` and `backend/test/` is empty.
  `sales.calculations.js` and the checkout rollback path are the priorities.
