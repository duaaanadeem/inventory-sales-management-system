# Products & Categories Module

Backend for products and categories (schema v3).

## Structure

```
backend/src/
├── config/pg-db.js
├── middleware/ (authMiddleware, roleMiddleware, errorMiddleware)
├── utils/ (response, validation, helpers)
└── features/
    ├── products/   (routes, controller, service, validation, upload)
    └── categories/ (routes, controller, service)
```

## Endpoints

| Method | Route | Notes |
|--------|-------|-------|
| GET | /api/products | search, category, page, limit |
| GET | /api/products/:id | single product |
| POST | /api/products | multipart/form-data, optional `image`, optional `openingStock` |
| PUT | /api/products/:id | partial update |
| DELETE | /api/products/:id | soft delete |
| GET | /api/categories | `{ success, data: [{ id, name }] }` |
| POST | /api/categories | `{ name }` |

Initial stock on product create calls `stockInManual` from `features/inventory/inventory.service`.

## Setup

```bash
cd backend
npm install
cp .env.example .env
npm run migrate
npm run dev
```
