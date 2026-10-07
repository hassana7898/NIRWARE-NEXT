# NIRWARE NEXT
### Industrial Poultry Feed Factory, Farmer & Fleet Logistics Management System

NIRWARE NEXT is a 100% greenfield, production-grade Modular Monolith built for industrial poultry feed manufacturing, farmer quota allocation, and fleet delivery logistics.

---

## Key Features

- **Central State Machine**: Deterministic, single-source-of-truth lifecycle for feed orders (`DRAFT` $\rightarrow$ `CONFIRMED`) and logistics dispatches.
- **Immutable Ledger Inventory**: Mathematical balance calculation without direct historical updates or deletes; audited counter-entries and reversals.
- **Cryptographic Fleet Handshake**: Ephemeral 6-digit OTP delivery confirmation, SHA-256 salted hashes, zero plaintext storage in database, 24h TTL, 3-attempt brute-force limit.
- **Production-Grade PostgreSQL 18**: Row-level locking (`SELECT ... FOR UPDATE`) preventing double-allocation in concurrent feed production lines.
- **Persian-First & RTL Architecture**: Astronomical Jalali date conversion, Vazirmatn typography, Persian text normalization, and official four-signature remittance vouchers.
- **Progressive Web App (PWA)**: Service worker caching and offline mutation queue with client-side UUID idempotency keys and background synchronization.
- **Unified Mobile Application**: React Native / Expo codebase with role routing for Factory Managers, Poultry Farmers, and Fleet Drivers.
- **AI Analytics & Vision OCR**: Natural language query engine over factory database and automated weighbridge slip data extraction.

---

## Monorepo Architecture

```
NIRWARE-NEXT/
│
├── apps/
│   ├── api/             # Express REST API Gateway (/api/v1) with PostgreSQL connection pool
│   ├── web/             # React 18, Vite, Tailwind CSS, TanStack Query, RTL, PWA
│   └── mobile/          # React Native, Expo, TypeScript (Manager, Farmer, Driver)
│
├── packages/
│   ├── config/          # Central Enums (UserRole, OrderStatus, DeliveryStatus, etc.)
│   ├── shared/          # Persian normalization, Jalali conversion, crypto OTP, error classes
│   ├── domain/          # OrderStateMachine, DeliveryStateMachine, BOM, Quota, Ledger math
│   ├── validation/      # Zod validation schemas
│   ├── contracts/       # TypeScript DTO request/response interfaces
│   ├── ui/              # Status badges, Persian labels, design tokens
│   └── api-client/      # Typed isomorphic HTTP client with token and idempotency injection
│
├── database/
│   ├── migrations/      # 001_initial_schema.sql (22 PostgreSQL tables, indexes, constraints)
│   └── seeds/           # 001_seed_data.sql (master data, users, formulas, inventory ledger)
│
├── tests/
│   ├── unit/            # State machine, BOM, Quota, Persian crypto, Inventory ledger
│   ├── integration/     # Authentication, Session, Idempotency-Key
│   ├── authorization/   # RBAC & IDOR object ownership tests
│   ├── concurrency/     # Production line concurrency & advisory locking
│   ├── e2e/             # 14-step Golden Workflow (Factory to Farmer Lifecycle)
│   └── runner.js        # Automated test runner
│
└── docs/                # Comprehensive architectural and operational documentation
```

---

## Quickstart

### 1. Prerequisites
- Node.js 20+
- PostgreSQL 18 running on port 5432
- Database credentials matching `.env` (`postgres:postgres123` by default)

### 2. Database Setup
```bash
# Apply schema and seeds
psql -U postgres -d nirware_next -f database/migrations/001_initial_schema.sql
psql -U postgres -d nirware_next -f database/seeds/001_seed_data.sql
```

### 3. Run Automated Verification (10/10 Suites)
```bash
npm run test:all
```

### 4. Build Monorepo
```bash
npm run build
```

### 5. Launch Servers
```bash
# Start backend API (port 4000)
npm run start:api

# Start web development server (port 5173)
npm run dev:web
```

---

## Test Verification Matrix

| Suite | Status | Execution Time | Description |
| :--- | :---: | :---: | :--- |
| **Unit - Persian & Cryptography** | `PASSED` | 235ms | Persian text normalization, Jalali calendar, OTP entropy |
| **Unit - State Machine** | `PASSED` | 237ms | Strict order lifecycle state machine & terminal states |
| **Unit - Feed Quota** | `PASSED` | 221ms | Quota allowance calculations & ceiling limits |
| **Unit - BOM & Formula** | `PASSED` | 303ms | 1000kg formula explosion & ingredient requirement math |
| **Unit - Inventory Ledger** | `PASSED` | 227ms | Immutable ledger calculation & reversal invariants |
| **Integration - Auth & Session** | `PASSED` | 655ms | PostgreSQL sessions table, bcrypt hashing, JWT issuance |
| **Authorization - RBAC & IDOR** | `PASSED` | 335ms | Multi-role permissions & farmer object ownership |
| **Concurrency - Production Locking** | `PASSED` | 435ms | Row-level advisory locking preventing double-allocation |
| **Idempotency - Idempotency-Key** | `PASSED` | 1007ms | Deduplication of rapid repeated network mutations |
| **Golden E2E - Factory to Farmer** | `PASSED` | 538ms | Complete 14-step operational journey to OTP confirmation |

---

## Documentation Index

- [Architecture Specification](docs/ARCHITECTURE.md)
- [Database Schema & ER Model](docs/DATABASE.md)
- [REST API Specification](docs/API.md)
- [Security & Compliance](docs/SECURITY.md)
- [Mobile Application Guide](docs/MOBILE.md)
- [Progressive Web App (PWA) Guide](docs/PWA.md)
- [Deployment & Operations](docs/DEPLOYMENT.md)
- [Testing & Verification](docs/TESTING.md)
