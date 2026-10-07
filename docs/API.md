# NIRWARE NEXT — REST API Specification (`/api/v1`)

## 1. Overview & Protocol Standards

The NIRWARE NEXT API is a RESTful JSON interface conforming to strict Persian-first business contracts and cryptographic security standards.

- **Base URL**: `/api/v1`
- **Content Type**: `application/json; charset=utf-8`
- **Authentication**: `Authorization: Bearer <token>`
- **Deduplication**: `Idempotency-Key: <uuidv4>` header supported on all mutation endpoints (`POST`, `PUT`, `PATCH`).

---

## 2. Standard Envelope Format

### 2.1 Success Response (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "9c1a5b4e-8d2f-4e1b-b384-71289dfb8c23",
    "timestamp": "2026-10-07T14:30:00.000Z"
  }
}
```

### 2.2 Error Response (`400`, `401`, `403`, `404`, `409`, `500`)
```json
{
  "success": false,
  "error": {
    "code": "INVENTORY_SHORTAGE",
    "message": "موجودی ماده اولیه 'ذرت دانه‌ای برزیل' در انبار کافی نیست.",
    "details": {
      "requiredKg": 6000,
      "availableKg": 4200
    }
  },
  "meta": {
    "requestId": "9c1a5b4e-8d2f-4e1b-b384-71289dfb8c23",
    "timestamp": "2026-10-07T14:30:00.000Z"
  }
}
```

---

## 3. Endpoints Catalog

### 3.1 Authentication & Sessions (`/api/v1/auth`)
- `POST /auth/login`: Authenticates with username and password. Returns JWT token and user profile.
- `GET /auth/me`: Retrieves the currently authenticated user session.
- `POST /auth/logout`: Invalidates the active JWT session and writes audit event.

### 3.2 Farmers & Farms (`/api/v1/farmers`)
- `GET /farmers`: Lists farmers with optional search and pagination.
- `POST /farmers`: Registers a new poultry farmer profile.
- `GET /farmers/:id`: Retrieves farmer details including registered farms and poultry houses.
- `GET /farmers/:id/quotas`: Retrieves approved feed quotas for the farmer.
- `GET /farmers/all/quotas`: Retrieves quota list across all farmers (Manager view).

### 3.3 Flocks & Daily Telemetry (`/api/v1/flocks`)
- `GET /flocks`: Lists breeding cycles/flocks.
- `POST /flocks`: Creates a new flock cycle (chick breed, chick count, hatch date).
- `GET /flocks/:id`: Retrieves flock metrics, age in days, mortality rate, and FCR.
- `POST /flocks/:id/records`: Logs daily farm telemetry (mortality count, feed consumed, bird weight).

### 3.4 Quotas (`/api/v1/quotas`)
- `POST /quotas`: Allocates and approves a new feed quota for a farmer/flock.

### 3.5 Products & BOM Formulas (`/api/v1/products`)
- `GET /products`: Lists products with filter by type (`FINISHED_FEED`, `RAW_MATERIAL`).
- `POST /products`: Registers a new feed or raw material SKU.
- `GET /products/all/formulas`: Lists 1000 kg Bill of Materials (BOM) formulas.
- `POST /products/:id/formula`: Defines or updates a BOM formula version.

### 3.6 Feed Orders & Central State Machine (`/api/v1/orders`)
- `GET /orders`: Lists feed purchase orders with status filter.
- `POST /orders`: Places a new feed order. Validates against farmer quota and product availability.
- `GET /orders/:id`: Retrieves order details, history, and current lifecycle state.
- `POST /orders/:id/transition`: Executes a transactional state transition through `OrderStateMachine`.

### 3.7 Production Line & Silo Inventory (`/api/v1/production`, `/api/v1/inventory`)
- `GET /production/batches`: Lists feed milling batches.
- `POST /production/batches`: Launches a batch. Acquires lock, validates BOM, checks and reserves raw material stock.
- `POST /production/batches/:id/complete`: Finalizes batch. Adds finished feed to inventory ledger and records wastage.
- `GET /inventory/balances`: Calculates live silo and warehouse balances from the immutable ledger.
- `GET /inventory/ledger`: Retrieves append-only ledger transaction journal.
- `POST /inventory/ledger/:id/reverse`: Reverses an erroneous ledger entry with counter-transaction and audit reason.

### 3.8 Logistics, Dispatch & Cryptographic OTP (`/api/v1/deliveries`)
- `GET /deliveries`: Lists all fleet dispatches.
- `GET /deliveries/my`: Lists dispatches assigned to the currently logged-in driver.
- `POST /deliveries/:id/start-transit`: Marks a delivery as `IN_TRANSIT`.
- `POST /deliveries/:id/confirm`: Verifies farmer's 6-digit OTP, records digital signature, transitions delivery to `CONFIRMED`, and decrements finished inventory.

### 3.9 Inbound Weighbridge Remittances (`/api/v1/inbound`)
- `GET /inbound`: Lists inbound raw material shipments.
- `POST /inbound`: Logs certified weighbridge entry, calculates shortage/wastage, adds to inventory ledger.

### 3.10 BI Analytics, Excel & AI Assistant (`/api/v1/reports`, `/api/v1/excel`, `/api/v1/ai`)
- `GET /reports/summary`: Retrieves factory production tonnage, fleet stats, and average FCR.
- `GET /excel/orders/export`: Streams formatted Excel spreadsheet of orders.
- `GET /excel/products/export`: Streams product catalog Excel file.
- `POST /ai/query`: Natural language query engine over factory database.
- `POST /ai/ocr-bill`: Extracts weighbridge slip metadata from OCR text.
- `GET /audit/logs`: Retrieves security audit log records.
