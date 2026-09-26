# Sales / POS Module


Open `http://localhost:5000/pos/`.

To add safe local demo records:

```powershell
npm run seed:demo
```

The command prints a demo staff password and JWT. Store the printed JWT in browser `localStorage` as `accessToken` before using checkout or Sales History:

```js
localStorage.setItem('accessToken', '<printed JWT>')
```

Set these values in `backend/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=the-shared-auth-secret
TAX_RATE=0
```

`DATABASE_URL` must include the database username and password, for example:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/inventory_sales
```

Alternatively configure `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD`.

`TAX_RATE=0` is temporary until the team confirms the business tax rule.

## Authentication integration

Protected Sales requests expect the existing team's JWT in:

```http
Authorization: Bearer <token>
```

The token payload must contain a user identifier in `id`, `userId`, or `sub`. The resolved identifier becomes `sales.staff_id`. The POS reads `accessToken` or `token` from `localStorage`.

## API

- `GET /api/sales/products/search?q=mouse` searches active products by name or SKU.
- `POST /api/sales` completes a transaction using `customerId`, `paymentMethod`, `discount`, and `items`.
- `GET /api/sales` returns Sales History.
- `GET /api/sales/:id` returns a sale and its item snapshots.
- `GET /api/sales/:id/invoice` returns the digital invoice data.

Checkout runs in one PostgreSQL transaction. It uses trusted product prices, stores historical `sale_items.unit_price`, calls `apply_stock_change()` for each item, creates an invoice, and rolls back if any step fails.
