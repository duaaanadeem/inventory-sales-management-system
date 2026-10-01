# Inventory Management API

The Inventory Management module provides API endpoints to track and adjust product stock levels. All endpoints require authentication (assumed JWT token). 

Write operations (POST) are rate-limited and idempotent, utilizing a `reference_id` to prevent duplicate processing on retries. 

All endpoints return JSON responses in the format:
- Success: `{ "success": true, "data": { ... } }`
- Error: `{ "success": false, "error": "Error message" }`

---

## 1. Manual Stock-In
`POST /inventory/stock-in`
Used for manual addition of stock, outside of normal purchase workflows.

- **Request Body:**
  - `product_id` (Integer, required): The ID of the product.
  - `qty` (Integer, required): Quantity to add (must be > 0).
  - `reference_id` (String, optional): Custom unique ID for this entry.
- **Success Response:**
  ```json
  {
    "success": true,
    "data": { "new_stock": 150 }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid input (missing fields, negative qty).

---

## 2. Deduct Stock (Sales)
`POST /inventory/deduct`
Called by the **Sales/POS module** on sale completion, passing `saleId` as `reference_id`.

- **Request Body:**
  - `product_id` (Integer, required): The ID of the product.
  - `qty` (Integer, required): Quantity sold (must be > 0).
  - `reference_id` (String, required): The `sale_id` or invoice ID.
- **Success Response:**
  ```json
  {
    "success": true,
    "data": { "new_stock": 45 }
  }
  ```
- **Error Responses:**
  - `409 Conflict`: "INSUFFICIENT_STOCK: product 10 has 5 in stock, cannot deduct 10".
  - `400 Bad Request`: Invalid input.

---

## 3. Add Stock (Purchases)
`POST /inventory/add`
Called by the **Purchase module** on a completed purchase, passing `purchaseId` as `reference_id`.

- **Request Body:**
  - `product_id` (Integer, required): The ID of the product.
  - `qty` (Integer, required): Quantity purchased (must be > 0).
  - `reference_id` (String, required): The `purchase_id`.
- **Success Response:**
  ```json
  {
    "success": true,
    "data": { "new_stock": 200 }
  }
  ```

---

## 4. Mark Damaged Stock
`POST /inventory/damage`
Used to mark units as damaged (deducts from current stock and adds to damaged count).

- **Request Body:**
  - `product_id` (Integer, required): The ID of the product.
  - `qty` (Integer, required): Quantity damaged (must be > 0).
  - `reference_id` (String, optional): Custom report ID.
- **Error Responses:**
  - `409 Conflict`: Insufficient stock to mark as damaged.

---

## 5. Adjust Stock Manually
`POST /inventory/adjust`
Used for manual corrections (+ or -) during stock audits.

- **Request Body:**
  - `product_id` (Integer, required): The ID of the product.
  - `qty` (Integer, required): Magnitude and direction of adjustment (can be negative).
  - `reference_id` (String, optional): Custom audit ID.
- **Success Response:**
  ```json
  {
    "success": true,
    "data": { "new_stock": 100 }
  }
  ```

---

## 6. Get Current Stock
`GET /inventory/current/:productId`
Fetches the current real-time stock for a single product.

- **Parameters:**
  - `productId` (Integer, required in URL)
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "current_stock": 50,
      "min_stock_level": 10
    }
  }
  ```

---

## 7. Get Inventory Summary
`GET /inventory/summary`
Provides high-level totals (total products, total items, low stock alerts) for the **Dashboard module**.

- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "total_products": 45,
      "total_stock_items": 1200,
      "low_stock_count": 3
    }
  }
  ```

---

## 8. Get Stock Report
`GET /inventory/report`
Fetches movement history for the **Reports/Export module**.

- **Query Parameters:**
  - `productId` (Integer, optional): Filter by product.
  - `from` (Date/String, optional): Start date.
  - `to` (Date/String, optional): End date.
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "history": [
        {
          "id": 1,
          "product_id": 10,
          "change_type": "in",
          "qty": 50,
          "previous_stock": 0,
          "new_stock": 50,
          "source": "manual",
          "reference_id": "manual_in_1710000000",
          "created_at": "2026-09-19T10:00:00.000Z"
        }
      ]
    }
  }
  ```

---

## 9. Get Low Stock Products
`GET /inventory/low-stock`
Fetches all products at or below their minimum stock level, useful for **Notifications module**.

- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "low_stock_products": [
        {
          "product_id": 10,
          "current_stock": 5,
          "min_stock_level": 10
        }
      ]
    }
  }
  ```
