# Inventory & Sales Management System — Products Module (Backend)

Owner: **Chaudhary Hammad Zahid**
Scope: **Products + Categories only** (Auth, Inventory, Sales, Purchases, Customers,
Suppliers belong to other teammates and are not in this repo).

Built against **schema v3** (`src/db/schema.sql`) and the shared team folder structure
(feature-based: `src/features/<feature>/`).

## Folder structure

```
hammad-products-backend/
├── server.js
├── package.json
├── .env.example
├── uploads/products/          # uploaded product images (served as static files)
└── src/
    ├── config/db.js           # PostgreSQL pool
    ├── db/
    │   ├── schema.sql         # full schema v3 (all tables, not just Products)
    │   └── migrate.js         # runs schema.sql against DATABASE_URL
    ├── middleware/
    │   ├── authMiddleware.js  # JWT verify — stub, not wired in yet (see below)
    │   ├── roleMiddleware.js  # role check — stub, not wired in yet
    │   └── errorMiddleware.js # single error-response formatter
    ├── utils/
    │   ├── response.js        # sendData / sendMessage — consistent JSON shape
    │   ├── validation.js      # shared low-level validators
    │   └── helpers.js         # asyncHandler, pagination parsing
    └── features/
        ├── products/
        │   ├── product.routes.js
        │   ├── product.controller.js
        │   ├── product.service.js
        │   ├── product.validation.js
        │   ├── product.upload.js         # multer config for image upload
        │   └── product.inventoryClient.js # calls Ali's stock endpoint
        └── categories/
            ├── category.routes.js
            ├── category.controller.js
            └── category.service.js
```

## Setup

```bash
cd hammad-products-backend
npm install
cp .env.example .env      # then fill DATABASE_URL
npm run migrate           # creates all tables from schema v3
npm run dev
```

## API endpoints (Products module)

| Method | Route              | Auth        | Notes |
|--------|---------------------|-------------|-------|
| GET    | /api/products        | none (for now) | search, category, page, limit query params |
| GET    | /api/products/:id     | none (for now) | single product, not paginated |
| POST   | /api/products         | none (for now, should be Admin-only) | multipart/form-data, optional `image` file |
| PUT    | /api/products/:id     | none (for now, should be Admin-only) | partial update |
| DELETE | /api/products/:id     | none (for now, should be Admin-only) | soft delete (`is_active = FALSE`) |
| GET    | /api/categories       | none        | `{ success, data: [{ id, name }] }` |
| POST   | /api/categories       | none (for now, should be Admin-only) | `{ name }` |

`GET /api/products` and `/api/products/:id` response shape (superset of what
was shared with teammates — extra fields are safe to ignore):

```json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "sku": "WM-001",
      "name": "Wireless Mouse",
      "category_id": 3,
      "category_name": "Electronics",
      "price": 1200,
      "cost": 800,
      "image_url": "/uploads/products/product-xxx.jpg",
      "min_stock_level": 5,
      "is_active": true,
      "created_at": "...",
      "updated_at": "...",
      "current_stock": 45
    }
  ],
  "pagination": { "total": 50, "page": 1, "limit": 20 }
}
```

## Things to confirm with the team before merging

These are assumptions made while rebuilding — nothing here changes the
contracts already promised, but they fill gaps that weren't fully spelled
out. Please double-check with the person named:

1. **Ali (Inventory) — stock endpoint contract.** His messages confirmed the
   *purchase-side* call (`source='purchase'`, `reference_id=purchase_id`,
   looped per item), but not the exact route/payload for our own
   "initial stock on product create" call. This project assumes:
   - Route: `POST /api/inventory/stock-change` (configurable via
     `INVENTORY_STOCK_ENDPOINT_PATH` in `.env` — code doesn't need to change
     if the path differs)
   - Body: `{ product_id, qty, change_type: 'in', source: 'manual', reference_id: null, changed_by }`
   File to update if this is wrong: `src/features/products/product.inventoryClient.js`.

2. **Write routes have no auth yet.** Ali only confirmed the two GET routes
   are auth-free. Per SRS, only Admin should create/edit/delete products —
   `authMiddleware.js` and `roleMiddleware.js` are ready but not wired into
   `product.routes.js` / `category.routes.js` yet, since the Auth module
   isn't merged. Once it is, uncomment the `TODO` lines in those route files.

3. **Categories as its own feature folder.** The shared folder-structure
   diagram only showed `auth/`, `products/`, `inventory/` — no `categories/`
   folder. Since `GET /api/categories` was promised as its own endpoint,
   it's kept as a small sibling feature folder here. Flag if it should
   instead live inside `features/products/`.
