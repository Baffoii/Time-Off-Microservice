# Time-Off Microservice

A production-quality Time-Off management microservice built with NestJS, TypeORM, and SQLite. Handles employee time-off balance tracking, request processing, and synchronization with an external HCM (Human Capital Management) system.

TRD: https://github.com/Baffoii/Time-Off-Microservice/blob/main/TRD.md
Test Cases: [https://github.com/Baffoii/Time-Off-Microservice/tree/main/test/unit](https://github.com/Baffoii/Time-Off-Microservice/tree/main/test)
Coverage: https://github.com/Baffoii/Time-Off-Microservice/tree/main/coverage

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Setup Instructions](#2-setup-instructions)
3. [Architecture Overview](#3-architecture-overview)
4. [API Endpoints](#4-api-endpoints)
5. [Mock HCM Server](#5-mock-hcm-server)
6. [Test Strategy](#6-test-strategy)
7. [Key Design Decisions](#7-key-design-decisions)

---

## 1. Project Overview

The Time-Off Microservice manages employee time-off balances and requests across multiple office locations. Key capabilities:

- **Balance Management**: Track employee time-off balances per location, synchronized with an external HCM system
- **Request Processing**: Submit, validate, and approve/reject time-off requests with full audit trail
- **HCM Synchronization**: Batch sync (nightly/weekly) and real-time reconciliation with the HCM system
- **Idempotency**: Safe retries via idempotency keys
- **Concurrency Safety**: Per-employee-location mutex prevents double-deductions
- **Failure Resilience**: HCM timeouts and errors produce FAILED requests without corrupting local state

---

## 2. Setup Instructions

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
git clone <repo>
cd Time-Off-Microservice
npm install
```

### Environment Variables

Copy the example env file and adjust as needed:

```bash
cp .env.example .env
```

| Variable         | Default                    | Description                              |
|------------------|----------------------------|------------------------------------------|
| `DATABASE_PATH`  | `./data/timeoff.db`        | SQLite database file path               |
| `HCM_BASE_URL`   | `http://localhost:3001`    | Base URL of the HCM system               |
| `HCM_TIMEOUT_MS` | `5000`                     | HCM HTTP request timeout in milliseconds |
| `PORT`           | `3000`                     | HTTP server port                         |

### Running the Application

```bash
# Development with hot-reload
npm run start:dev

# Production build
npm run build
npm run start:prod

# Seed the database with sample data
npm run start:seed
```

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# With coverage
npm run test:cov
```

---

## 3. Architecture Overview

```
+-------------------------------------------------------------+
|                     NestJS Application                       |
|                                                              |
|  +--------------+  +--------------+  +-------------------+  |
|  |  Employees   |  |  Locations   |  |     Balances      |  |
|  |  Controller  |  |  Controller  |  |    Controller     |  |
|  |  Service     |  |  Service     |  |    Service        |  |
|  +------+-------+  +------+-------+  +--------+----------+  |
|         |                 |                   |              |
|  +------v-----------------v-------------------v----------+  |
|  |                   TypeORM / SQLite                      |  |
|  |  Employee | Location | EmployeeLocation |               |  |
|  |  TimeOffBalance | TimeOffRequest                        |  |
|  +----------------------------------------------------------+  |
|                                                              |
|  +------------------+  +----------------------------------+  |
|  |   TimeOff        |  |           Sync                   |  |
|  |   Controller     |  |        Controller                |  |
|  |   Service        |  |        Service                   |  |
|  |   (+ Mutex)      |  |   (batchSync + reconcile)        |  |
|  +------------------+  +----------------------------------+  |
|                                                              |
|  +------------------------------------------------------+    |
|  |              HcmClientService                         |    |
|  |  getBalance() | submitTimeOff() | getBatchBalances()  |    |
|  +------------------------------------+------------------+    |
+---------------------------------------------|--------------+
                                              | HTTP (axios)
                                              v
                             +------------------------+
                             |   External HCM System   |
                             |  (or MockHcmModule for  |
                             |       tests)            |
                             +------------------------+
```

### Module Structure

```
src/
  main.ts                         # Bootstrap
  app.module.ts                   # Root module
  common/
    exceptions/                   # Custom typed exceptions
    filters/                      # Global HTTP exception filter
  database/
    database.module.ts            # TypeORM setup
    entities/                     # TypeORM entities
    seeds/                        # Database seed script
  employees/                      # Employee CRUD
  locations/                      # Location CRUD
  balances/                       # Balance read/upsert
  time-off/                       # Core request flow (with mutex)
  sync/                           # Batch sync + reconcile
  hcm-client/                     # HTTP client for HCM
  mock-hcm/                       # In-process mock HCM server
```

---

## 4. API Endpoints

### Balances

#### `GET /balances/:employeeId`

Returns all balances for an employee across all locations.

**Response:**
```json
[
  {
    "id": "uuid",
    "employeeId": "uuid",
    "locationId": "uuid",
    "balanceDays": 10.00,
    "source": "HCM_BATCH",
    "lastSyncedAt": "2024-01-15T10:00:00.000Z",
    "missingFromLatestBatch": false,
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
]
```

#### `GET /balances/:employeeId/:locationId?refresh=true`

Returns the balance for a specific employee-location pair. If `refresh=true`, fetches the latest from HCM before returning (falls back to local if HCM fails).

---

### Time-Off Requests

#### `POST /time-off-requests`

Submit a new time-off request.

**Request Body:**
```json
{
  "employeeId": "uuid",
  "locationId": "uuid",
  "requestedDays": 2.5,
  "idempotencyKey": "optional-unique-key"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "employeeId": "uuid",
  "locationId": "uuid",
  "requestedDays": 2.5,
  "status": "APPROVED",
  "hcmTransactionId": "TX-12345",
  "failureReason": null,
  "idempotencyKey": "optional-unique-key",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Status values:**

| Status | Description |
|--------|-------------|
| `APPROVED` | Request accepted; balance deducted locally and in HCM |
| `APPROVED_WITH_WARNING` | HCM accepted but returned no transaction ID |
| `REJECTED` | Validation failed |
| `FAILED` | HCM was unreachable; local state unchanged |
| `PENDING` | Reserved for future async processing |

**Error Responses:**
- `400 Bad Request` - Invalid input (requestedDays <= 0)
- `404 Not Found` - Employee or location does not exist
- `422 Unprocessable Entity` - Employee inactive, pairing inactive, or insufficient balance

#### `GET /time-off-requests/:id`

Retrieve a specific request by ID.

#### `GET /time-off-requests?employeeId=&locationId=&status=`

List requests with optional filters.

---

### Sync

#### `POST /sync/hcm/batch`

Ingest a batch of balances from HCM (e.g., nightly sync).

**Request Body:**
```json
[
  { "employeeId": "uuid", "locationId": "uuid", "balanceDays": 15 },
  { "employeeId": "uuid", "locationId": "uuid", "balanceDays": 8.5 }
]
```

**Response (200):**
```json
{
  "updated": 5,
  "inserted": 2,
  "skipped": 1,
  "quarantined": 0,
  "stillMissing": 3
}
```

Summary fields:
- `updated` - Existing balances that were updated
- `inserted` - New employee-location pairs added
- `skipped` - Duplicate records in payload (last value wins, earlier occurrences counted)
- `quarantined` - Records with negative `balanceDays` (rejected, not written to DB)
- `stillMissing` - Balances that exist locally but were absent from this batch

#### `POST /sync/hcm/reconcile/:employeeId/:locationId`

Fetch and update a single employee-location balance from HCM.

**Response (200):** Updated balance object.

---

### Employees (read-only)

- `GET /employees` - List all employees
- `GET /employees/:id` - Get employee by ID

### Locations (read-only)

- `GET /locations` - List all locations
- `GET /locations/:id` - Get location by ID

---

## 5. Mock HCM Server

The `MockHcmModule` provides an in-process mock HCM server used in integration and E2E tests. It stores balances in a `Map` and supports configurable failure modes.

### Admin Endpoints

- `POST /hcm/admin/balances` - Set a balance: `{ employeeId, locationId, balanceDays }`
- `POST /hcm/admin/mode` - Switch failure mode: `{ mode: "normal" | "timeout" | "serverError" | "unreliableValidation" | "staleResponse" }`
- `POST /hcm/admin/reset` - Reset all balances and mode

### HCM Endpoints

- `GET /hcm/balances/:employeeId/:locationId` - Get balance (404 if not found)
- `POST /hcm/time-off` - Deduct balance: `{ employeeId, locationId, days }`
- `GET /hcm/balances/batch` - Return all balances

### Failure Modes

| Mode | Behavior |
|------|----------|
| `normal` | Standard operation |
| `timeout` | Delays responses 500ms (tests use 100ms timeout) |
| `serverError` | Returns HTTP 500 |
| `unreliableValidation` | Accepts deductions even if balance goes negative |
| `staleResponse` | Returns balance without modifying state |

In tests, `MockHcmClientService` is injected directly into the NestJS DI container (no HTTP calls), making tests fast and deterministic.

---

## 6. Test Strategy

### Unit Tests (`test/unit/`)

All dependencies mocked with Jest. Tests focus on pure business logic in isolation.

| File | What It Tests |
|------|---------------|
| `balances.service.spec.ts` | Balance CRUD, HCM refresh, fallback behavior |
| `time-off.service.spec.ts` | All validation/approval paths, concurrency, idempotency |
| `sync.service.spec.ts` | Batch sync insert/update/missing/quarantine/duplicate, reconcile |
| `hcm-client.service.spec.ts` | HTTP success, timeout, 404, 500 error handling |

### Integration Tests (`test/integration/`)

Real in-memory SQLite + `MockHcmClientService` via NestJS DI. Verifies service-to-database interaction.

| File | What It Tests |
|------|---------------|
| `time-off.integration.spec.ts` | Full request flow, idempotency, concurrency, failure modes |
| `sync.integration.spec.ts` | Batch sync and reconcile with real DB |
| `balances.integration.spec.ts` | Balance reads, refresh, consistency after operations |

### E2E Tests (`test/e2e/`)

Full HTTP stack via `supertest` — covers all 30 specified test scenarios:

1. Happy path: 10 days, request 2, APPROVED, balance 8
2. GET balance returns correct data
3. Batch sync inserts new balances
4. Batch sync updates existing balances
5. Reject requestedDays = 0
6. Reject requestedDays < 0
7. Reject nonexistent employee
8. Reject nonexistent location
9. Reject inactive employee
10. Reject inactive employee-location pairing
11. Reject insufficient local balance (before HCM check)
12. Reject after realtime HCM shows insufficient balance
13. Reconcile: local=10, HCM=15, local becomes 15
14. Local=10, HCM=5, request for 8 rejected
15. Work anniversary refresh via store update
16. Start-of-year refresh via batch sync
17. HCM unreliableValidation: local check still rejects
18. HCM returns no transactionId: APPROVED_WITH_WARNING
19. HCM timeout during balance check: FAILED
20. HCM timeout during submit: FAILED (no local deduction)
21. Batch with negative balance: existing data preserved
22. Concurrency: 10 days, two requests for 7, only one approved
23. Duplicate idempotency key: same request returned
24. Retry after failed HCM call succeeds
25. Batch sync: new pair inserted
26. Batch sync: omitted pair marked missing
27. Batch sync: duplicate records handled deterministically
28. Batch sync: negative balance quarantined
29. Decimal balances work (1.5 days)
30. Local balance never goes negative under concurrency

---

## 7. Key Design Decisions

### Why TypeORM + SQLite (better-sqlite3)

TypeORM provides a clean entity model with decorators and a repository pattern well-suited to NestJS. `better-sqlite3` is a synchronous driver that avoids connection pool complexity for a single-process service and runs exceptionally fast in tests (in-memory DB). For production scale, the TypeORM config can switch to PostgreSQL by changing one option. We use `synchronize: true` for development convenience; a migration-based approach is recommended for production.

### Defensive Validation Strategy

Validation happens in layers, cheapest to most expensive:

1. DTO validation (`class-validator`) - reject malformed requests at the HTTP boundary
2. Local entity checks (employee exists + active, location exists, pairing active) - fast DB lookups
3. Local balance check - cheap read; rejects clearly insufficient requests before touching HCM
4. HCM realtime balance check - updates local if stale, then re-validates
5. HCM submission - only reached if all prior checks pass

This minimizes unnecessary HCM calls and surfaces errors as early as possible.

### HCM Sync Approach (Batch vs Realtime)

- **Batch sync** (`POST /sync/hcm/batch`): For nightly/weekly bulk updates. Marks all existing records `missingFromLatestBatch=true` before processing, allowing detection of removed employees. Handles duplicates (last-wins), quarantines negatives, returns a summary.
- **Realtime reconcile** (`POST /sync/hcm/reconcile`): On-demand refresh of a single balance after an event (work anniversary, manual correction).
- **Pull-through refresh** (`GET /balances?refresh=true`): Lazy refresh during read operations.

### Idempotency Implementation

`idempotencyKey` is a column on `TimeOffRequest`. On each POST, if provided, the service checks for an existing request with that key _before_ any business logic. If found, returns the original request immediately. This makes retries safe: a client can re-POST with the same key after a network timeout and get the same result without a second deduction.

### Concurrency Handling

SQLite serializes writes at the database level, but within a single NestJS async process a race condition exists: two concurrent requests can both read a balance of 10, both pass the check, and both deduct - resulting in a negative balance or over-deduction.

**Solution**: A per-`(employeeId, locationId)` `Mutex` from `async-mutex` serializes concurrent requests for the same pair within the process. The mutex wraps the read-check-write cycle. The database transaction (balance deduction + request creation) provides atomicity. Together they ensure correctness.

### Failure Modes and What Happens

| Scenario | Outcome |
|----------|---------|
| HCM timeout during balance check | Create `FAILED` request; local balance unchanged |
| HCM timeout during submit | Create `FAILED` request inside transaction; local balance NOT deducted |
| HCM 500 during balance check | Re-throw as `HcmServerError`; request fails with 502 |
| HCM returns success, no txn ID | Create `APPROVED_WITH_WARNING`; local balance IS deducted (HCM accepted) |
| HCM returns `success: false` | Create `FAILED` request; no deduction |
| Batch sync with negative balance | Quarantine record; existing local balance untouched |
| Batch sync with missing pairs | Mark `missingFromLatestBatch=true`; balance value unchanged |
| Balance not in local DB | Treated as 0; request will fail insufficient balance check |
