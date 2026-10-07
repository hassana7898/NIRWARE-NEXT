# NIRWARE NEXT — Testing & Verification Strategy

## 1. Overview & Verification Philosophy

NIRWARE NEXT adheres to strict **evidence-based software engineering**. No test suite is mocked with in-memory SQLite or fake DB abstractions; all integration, concurrency, and E2E suites run against a **real PostgreSQL 18** service.

Run the entire verification suite:
```bash
npm run test:all
```

---

## 2. Automated Test Matrix (10/10 Passing Suites)

### 2.1 Unit — Persian & Cryptography (`tests/unit/persian-crypto.test.js`)
- Validates Persian text normalization (`normalizePersianText`), including Arabic ye/kaf unification and half-space cleanup.
- Validates bidirectional Jalali/Gregorian calendar conversion across leap years.
- Validates Persian digit formatting and currency formatting.
- Tests cryptographic 6-digit OTP entropy, SHA-256 salted hashing, and constant-time string comparison.

### 2.2 Unit — Central State Machine (`tests/unit/state-machine.test.js`)
- Enforces strict unidirectional state transitions for `OrderStateMachine` (`DRAFT` -> `SUBMITTED` -> `PENDING_APPROVAL` -> `APPROVED` -> `PRODUCTION_PENDING` -> `READY` -> `ASSIGNED_TO_DRIVER` -> `PICKED_UP` -> `IN_TRANSIT` -> `DELIVERED` -> `CONFIRMED`).
- Verifies rejection of illegal jumps (e.g. attempting to jump from `DRAFT` directly to `DELIVERED`).
- Validates terminal states (`CONFIRMED`, `CANCELLED`, `REJECTED`).

### 2.3 Unit — Feed Quota Calculator (`tests/unit/quota.test.js`)
- Validates quota consumption calculations against active flock head count.
- Enforces quota ceiling violations and remaining balance subtraction.

### 2.4 Unit — BOM & Formula Calculator (`tests/unit/bom.test.js`)
- Validates 1000 kg master formula normalization.
- Calculates dynamic raw material explosion requirements for arbitrary production batch weights (e.g. 5,000 kg, 20,000 kg).
- Validates FCR (Feed Conversion Ratio) calculation formulas.

### 2.5 Unit — Immutable Inventory Ledger (`tests/unit/inventory-ledger.test.js`)
- Verifies append-only ledger transaction math: $\text{Opening} + \text{Inbound} + \text{Production}_{\text{In}} - \text{Outbound} - \text{Consumption} \pm \text{Adjustment} = \text{Balance}$.
- Validates that historical rows cannot be altered; corrections must invoke `REVERSAL` entries.

### 2.6 Integration — Authentication & Session (`tests/integration/auth.test.js`)
- Executes full user registration, password verification (bcrypt), and JWT creation.
- Verifies session insertion into PostgreSQL `sessions` table.
- Validates session revocation upon logout.

### 2.7 Authorization — RBAC & IDOR (`tests/authorization/rbac.test.js`)
- Tests role-based permissions matrix for `SUPER_ADMIN`, `MANAGER`, `SCALE_OPERATOR`, `FARMER`, and `DRIVER`.
- Enforces IDOR prevention: farmers cannot read or transition orders owned by other farmers.

### 2.8 Concurrency — Production Locking (`tests/concurrency/production-concurrency.test.js`)
- Simulates two concurrent workers launching batches simultaneously with raw material constraints.
- Confirms that row-level advisory locks (`SELECT ... FOR UPDATE`) prevent double-deduction: one worker succeeds, while the other receives `INVENTORY_SHORTAGE` without corrupting stock totals.

### 2.9 Idempotency — Idempotency-Key Header (`tests/integration/idempotency.test.js`)
- Simulates rapid duplicate network submissions with identical `Idempotency-Key` headers.
- Verifies that only the initial request performs database writes, and subsequent calls receive cached responses with identical payloads.

### 2.10 Golden E2E — Factory to Farmer Lifecycle (`tests/e2e/golden-workflow.test.js`)
A comprehensive 14-step integration test modeling the real-world operational journey:
1. Create and authenticate Farmer
2. Allocate statutory feed quota (30,000 kg)
3. Register flock cycle (20,000 chicks)
4. Submit purchase order for 10,000 kg finished feed
5. Manager reviews and transitions order to `APPROVED`
6. Weighbridge records inbound shipment of raw material (corn) into ledger
7. Launch production batch: checks BOM, reserves raw materials, mixes feed
8. Complete batch: adds 10,000 kg finished feed to silo ledger
9. Order transitions to `READY`
10. Dispatch order: assigns Driver and truck license plate
11. Generate ephemeral 6-digit cryptographic OTP; hash recorded in DB
12. Driver starts transit (`IN_TRANSIT`)
13. Truck arrives at farm; Driver submits Farmer's OTP
14. System verifies hash, transitions order to `CONFIRMED`, writes digital signature, and decrements finished inventory.
