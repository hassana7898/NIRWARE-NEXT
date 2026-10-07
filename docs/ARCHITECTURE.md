# NIRWARE NEXT — Architecture Specification

## 1. High-Level Architectural Vision

NIRWARE NEXT is an enterprise-grade, industrial poultry feed manufacturing and fleet logistics management platform built from scratch (100% greenfield). It coordinates the entire vertical integration chain from raw material procurement and factory scale weighing, through computer-controlled batch production and inventory ledgering, to farmer feed quota allocation, order fulfillment, and cryptographic fleet delivery verification.

```
+-----------------------------------------------------------------------------------+
|                                  NIRWARE NEXT                                     |
|                              Modular Monolith                                     |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  |     React Web      |   |   Progressive Web     |   |  React Native / Expo   |  |
|  |  (Vite + Tailwind) |   |  App (Offline Queue)  |   | (Manager/Farmer/Driver)|  |
|  +---------+----------+   +-----------+-----------+   +-----------+------------+  |
|            |                          |                           |               |
|            +--------------------------+---------------------------+               |
|                                       |                                           |
|                                       v                                           |
|                            [ Typed API Client ]                                   |
|                                       |                                           |
|                                       v                                           |
|                        +------------------------------+                           |
|                        |   REST API Gateway (/api/v1) |                           |
|                        |   (Express + Middleware)     |                           |
|                        +--------------+---------------+                           |
|                                       |                                           |
|       +-------------------------------+-------------------------------+           |
|       |                               |                               |           |
|       v                               v                               v           |
|  +------------+               +---------------+               +---------------+   |
|  |   Domain   |               |   Services    |               |  Validation   |   |
|  |  - OrderSM |               |  - Auth       |               |  - Zod Domain |   |
|  |  - Delivery|               |  - Production |               |    Contracts  |   |
|  |  - Ledger  |               |  - Logistics  |               +---------------+   |
|  |  - Quota   |               |  - Inbound    |                                   |
|  |  - BOM/FCR |               |  - Inventory  |                                   |
|  +------------+               +-------+-------+                                   |
|                                       |                                           |
|                                       v                                           |
|                        +------------------------------+                           |
|                        |   Real PostgreSQL 18 Engine  |                           |
|                        |   (Pool, Locks, Audit Log)   |                           |
|                        +------------------------------+                           |
+-----------------------------------------------------------------------------------+
```

---

## 2. Architectural Pillars

### 2.1 Modular Monolith
The architecture intentionally rejects microservice fragmentation in favor of a cohesive, high-performance Modular Monolith:
- **Shared Domain Packages**: `@nirware/config`, `@nirware/shared`, `@nirware/domain`, `@nirware/validation`, `@nirware/contracts`, `@nirware/ui`, and `@nirware/api-client`.
- **Zero Cross-Module State Leaks**: All business rules (Order State Machine, Delivery Lifecycle, BOM explosion, Quota verification) reside strictly in `@nirware/domain`.
- **Single Source of Truth**: Neither frontend routes nor database triggers dictate state transitions; transitions must pass through `OrderStateMachine.canTransition()` and `DeliveryStateMachine.canTransition()`.

### 2.2 Immutable Ledger-Based Inventory
Stock cannot be modified via direct historical `UPDATE` or `DELETE` statements.
- **Formula**:
  $$\text{Balance} = \text{Opening} + \text{Inbound} + \text{Production}_{\text{In}} - \text{Outbound} - \text{Consumption} \pm \text{Adjustment}$$
- **Auditing**: Every balance delta is a discrete, append-only row in `inventory_ledger`.
- **Correction**: Erroneous entries are rectified via `InventoryTransactionType.REVERSAL` with a reason string, followed by a new correction row.

### 2.3 Real PostgreSQL 18 Database
- Real PostgreSQL 18 running on port 5432.
- Advisory row-level locks (`SELECT ... FOR UPDATE` and `pg_advisory_xact_lock`) prevent double-allocation during concurrent production batch launches.
- ACID transactions ensure that feed order state transitions, finished stock creation, and raw material deduction occur atomically or roll back completely.

### 2.4 Cryptographic OTP & Two-Legged Handshake
- Upon dispatch of feed trucks (`ASSIGNED_TO_DRIVER` / `IN_TRANSIT`), an ephemeral, cryptographically secure 6-digit OTP is generated.
- The plaintext OTP is never persisted in plaintext. Only its SHA-256 salted hash is stored in the database.
- The plaintext OTP is delivered exclusively to the verified Farmer (via SMS / mobile app).
- Delivery is finalized only when the Driver submits the Farmer's OTP, which is hashed and matched inside a transaction that marks the order `CONFIRMED` and decrements finished inventory.

### 2.5 Resilient Offline PWA & Unified Mobile App
- **Web/PWA**: Service Worker caching with `OfflineQueueManager`. Mutations executed while disconnected are queued in IndexedDB/LocalStorage with client-generated `Idempotency-Key` UUIDs and automatically flushed with transactional deduplication upon reconnection.
- **Mobile (`apps/mobile`)**: A unified React Native / Expo codebase supporting Manager, Farmer, and Driver user experiences through dynamic role routing.
