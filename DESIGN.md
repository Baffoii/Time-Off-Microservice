# Time-Off Microservice — Technical Design Document

---

## 1. System Overview and Goals

### Context

The Time-Off Microservice is a backend service that bridges employee time-off management between a local application database and an external Human Capital Management (HCM) system. The service owns a local cache of employee time-off balances and provides an API for submitting requests, querying balances, and synchronizing with the HCM.

### Goals

- Provide a reliable, consistent API for time-off requests even when the HCM is temporarily unavailable
- Keep local balances synchronized with the HCM through both scheduled batch syncs and on-demand reconciliation
- Never allow a local balance to go below zero
- Handle HCM failures gracefully — surface them as explicit FAILED states rather than data corruption
- Support safe client retries via idempotency keys
- Enable concurrent requests safely through process-level serialization

### Non-Goals

- This service does not implement authentication/authorization (assumed to be handled by an API gateway)
- This service does not manage leave types or accrual rules (owned by HCM)
- Calendar day validation (holidays, weekends) is out of scope

---

## 2. Data Model

### Entity Relationship Overview

```
Employee (1) --- (N) EmployeeLocation (N) --- (1) Location
Employee (1) --- (N) TimeOffBalance
Employee (1) --- (N) TimeOffRequest
Location  (1) --- (N) TimeOffBalance
Location  (1) --- (N) TimeOffRequest
```

### Entities

#### Employee
Represents a person. `status` can be `ACTIVE` or `INACTIVE`. Requests and balance operations are only permitted for active employees.

#### Location
Represents an office location. Employees can be associated with multiple locations. Balances and requests are scoped to a specific `(employee, location)` pair.

#### EmployeeLocation
Junction table tracking which employees belong to which locations. Has an `active` flag — an inactive pairing blocks requests even for active employees.

#### TimeOffBalance
The local cache of an employee's time-off balance at a specific location. Key fields:
- `balanceDays` — DECIMAL(10,2), supports fractional days
- `source` — how the balance was last set: `HCM_BATCH`, `HCM_REALTIME`, or `LOCAL_PENDING`
- `lastSyncedAt` — timestamp of last HCM synchronization
- `missingFromLatestBatch` — flag set during batch sync for balances absent from the payload

#### TimeOffRequest
Immutable audit record of every time-off request attempt. Key fields:
- `status` — one of `PENDING`, `APPROVED`, `REJECTED`, `FAILED`, `APPROVED_WITH_WARNING`
- `hcmTransactionId` — returned by HCM on successful submission; null if HCM had no ID
- `failureReason` — human-readable explanation for FAILED/REJECTED states
- `idempotencyKey` — client-provided key for safe retries

---

## 3. Request Processing Flow

### POST /time-off-requests — Full Decision Tree

```
Receive request: { employeeId, locationId, requestedDays, idempotencyKey? }
          |
          v
[1] requestedDays > 0?
      No  --> 400 Bad Request
          |
          v
[2] Employee exists?
      No  --> 404 EmployeeNotFoundException
          |
          v
[3] Employee.status === 'ACTIVE'?
      No  --> 422 InactiveEmployeeException
          |
          v
[4] Location exists?
      No  --> 404 LocationNotFoundException
          |
          v
[5] EmployeeLocation exists and active?
      No  --> 422 InactiveEmployeeLocationException
          |
          v
[6] idempotencyKey provided AND existing request found?
      Yes --> return existing request (no processing)
          |
          v
[ACQUIRE MUTEX for (employeeId, locationId)]
          |
          v
[7] localBalance >= requestedDays?
      No  --> 422 InsufficientBalanceException (release mutex)
          |
          v
[8] Call HCM: getBalance(employeeId, locationId)
      Timeout --> save FAILED request, return 201 FAILED (release mutex)
      Error   --> re-throw (release mutex)
          |
          v
[9] hcmBalance != localBalance?
      Yes --> update local balance to hcmBalance
          |
          v
[10] hcmBalance >= requestedDays?
      No  --> 422 InsufficientBalanceException (release mutex)
          |
          v
[BEGIN DB TRANSACTION]
          |
          v
[11] Call HCM: submitTimeOff(employeeId, locationId, requestedDays)
      Timeout/Error --> save FAILED request, ROLLBACK, return 201 FAILED
          |
          v
[12] hcmResult.success === false?
      Yes --> save FAILED request, ROLLBACK, return 201 FAILED
          |
          v
[13] Deduct local balance: balance -= requestedDays
          |
          v
[14] hcmResult.transactionId present?
      Yes --> save APPROVED request
      No  --> save APPROVED_WITH_WARNING request
          |
[COMMIT TRANSACTION]
[RELEASE MUTEX]
          |
          v
      return 201
```

### Key Invariants

- Local balance is NEVER deducted unless HCM returns `success: true`
- A FAILED request is always created when HCM is unreachable (no silent failures)
- The mutex + transaction ensures atomicity: either the balance is deducted AND the request is created APPROVED, or neither happens
- APPROVED_WITH_WARNING is treated as a successful deduction (HCM accepted the request, it just didn't return an ID)

---

## 4. Synchronization Design

### Batch Sync Protocol

The batch sync is designed for nightly or weekly ingestion of the full HCM balance snapshot.

**Algorithm:**

```
1. Begin transaction
2. UPDATE all TimeOffBalance SET missingFromLatestBatch = true
3. Deduplicate payload (last-wins by order in array):
   - Track seen keys in a Map
   - Count earlier occurrences as "skipped"
4. For each unique (employeeId, locationId) in payload:
   a. If balanceDays < 0: quarantine (log, skip)
   b. UPSERT with source=HCM_BATCH, missingFromLatestBatch=false
      - If exists: UPDATE (increment updated counter)
      - If not exists: INSERT (increment inserted counter)
5. Commit
6. COUNT balances WHERE missingFromLatestBatch = true (stillMissing)
7. Return summary
```

**Why mark-and-sweep?** The mark (`missingFromLatestBatch = true`) before processing allows the service to identify employee-location pairs that exist locally but were omitted from the HCM batch. This could indicate employees who left the company, changed locations, or a data quality issue in the HCM export. Consumers can query these records and take appropriate action.

### Realtime Reconcile

Point-in-time refresh for a specific employee-location pair. Used when:
- Processing a time-off request (after local check passes)
- On-demand via `POST /sync/hcm/reconcile/:emp/:loc`
- Triggered by work anniversary or manual correction events

The reconcile simply calls `HcmClientService.getBalance()` and upserts the result with `source=HCM_REALTIME`.

---

## 5. HCM Client Design

### Interface

```typescript
interface IHcmClientService {
  getBalance(employeeId, locationId): Promise<{ balanceDays: number }>;
  submitTimeOff(employeeId, locationId, days): Promise<{ transactionId: string | null; success: boolean }>;
  getBatchBalances(): Promise<Array<{ employeeId, locationId, balanceDays }>>;
}
```

### Error Taxonomy

| Exception | Trigger | HTTP Status Mapping |
|-----------|---------|---------------------|
| `HcmTimeoutError` | `ECONNABORTED`, `ETIMEDOUT`, or message contains "timeout" | 504 Gateway Timeout |
| `HcmNotFoundError` | HTTP 404 from HCM | 404 Not Found |
| `HcmServerError` | HTTP 5xx from HCM | 502 Bad Gateway |

These typed exceptions are caught in the business layer and handled appropriately (FAILED request vs. re-throw), and at the global exception filter for correct HTTP responses.

### Timeout Configuration

The timeout is configured via `HCM_TIMEOUT_MS` env var (default: 5000ms). Passed directly to axios as the `timeout` option. The mock HCM in tests uses a 500ms delay while tests set the timeout to 100ms, keeping tests fast.

---

## 6. Concurrency and Consistency

### The Race Condition

In an async Node.js process, two concurrent requests can interleave:

```
Request A: read balance = 10  ---->  check (10 >= 7) passes
                                                       Request B: read balance = 10 ---> check passes
Request A: call HCM, deduct 7, write balance = 3
                                                       Request B: call HCM, deduct 7, write balance = -4  !!!
```

### Solution: Per-Key Mutex

`async-mutex` provides a `Mutex` class. The `TimeOffService` maintains a `Map<string, Mutex>` keyed by `${employeeId}:${locationId}`. Before processing any request, the service acquires the mutex for that key. All subsequent operations (balance read, HCM call, balance write, request creation) run within `mutex.runExclusive()`.

**Properties:**
- Requests for different `(employee, location)` pairs run fully concurrently (no contention)
- Requests for the same pair are serialized: the second request sees the balance left by the first
- The mutex map is in-memory — on service restart, all locks reset (acceptable since requests are short-lived)

### Database Transaction

Within the mutex, the critical section (balance deduction + request creation) runs inside a TypeORM `DataSource.transaction()`. This ensures:
- Both writes are atomic — no state where balance is deducted but request is not created
- If the HCM submit fails mid-transaction, both writes are rolled back

### Floating Point Handling

Balance comparisons use a small epsilon (`0.001`) to avoid floating-point edge cases:

```typescript
if (localBalance >= requestedDays - 0.001) { /* sufficient */ }
```

Balances are stored as `DECIMAL(10,2)` and rounded to 2 decimal places before writes:

```typescript
parseFloat(days.toFixed(2))
```

---

## 7. Testing Architecture

### Test Pyramid

```
         /\
        /  \   E2E Tests (30 scenarios)
       / e2e \  Full HTTP stack, real SQLite, mock HCM via DI
      /--------\
     /          \
    / Integration \ Real SQLite in-memory, mock HCM via DI
   /--------------\
  /                \
 /   Unit Tests     \ All dependencies mocked with Jest
/--------------------\
```

### Mock HCM Strategy

The key insight is that `HcmClientService` is provided via NestJS DI. In tests:

```typescript
// In test module setup:
.overrideProvider(HcmClientService)
.useValue(new MockHcmClientService(store))
```

`MockHcmClientService` uses the shared `MockHcmStore` instance directly (no HTTP). This means:
- No network calls, no ports, no process management
- Full control over balances and failure modes
- Shared state between the application under test and the test assertions (same `store` instance)
- Tests run in parallel safely (each test suite creates its own `store` instance)

### Test Isolation

Each test suite creates a fresh `TestingModule` with an in-memory SQLite database. Integration and E2E tests clear all tables and reset the store in `beforeEach`, ensuring test independence.

### Failure Mode Testing

The `MockHcmStore.mode` field controls HCM behavior. Test scenarios:

```typescript
// Timeout during balance check:
store.setMode('timeout');
// --> MockHcmClientService.getBalance() throws HcmTimeoutError
// --> TimeOffService creates FAILED request

// No transaction ID (APPROVED_WITH_WARNING):
store.deductBalance = () => ({ success: true, transactionId: undefined });
// --> TimeOffService creates APPROVED_WITH_WARNING, still deducts locally
```

### Concurrency Test Design

Concurrent requests are tested by firing multiple `Promise.all()` HTTP requests in E2E tests. The mutex ensures deterministic behavior — no timing-dependent flakiness. The test asserts:
1. Exactly one APPROVED response
2. Local balance is non-negative after both complete
