import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedTestData } from '../helpers/test-app.helper';
import { MockHcmStore } from '../../src/mock-hcm/mock-hcm-store';
import { TimeOffBalance } from '../../src/database/entities/time-off-balance.entity';
import { TimeOffRequest } from '../../src/database/entities/time-off-request.entity';

describe('App E2E Tests - All 30 Scenarios', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let store: MockHcmStore;
  let alice: any;
  let bob: any;
  let charlie: any;
  let nyc: any;
  let sf: any;

  beforeAll(async () => {
    ({ app, dataSource, store } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.getRepository(TimeOffRequest).clear();
    await dataSource.getRepository(TimeOffBalance).clear();
    const entities = ['employee_location', 'location', 'employee'];
    for (const e of entities) {
      await dataSource.query(`DELETE FROM "${e}"`);
    }
    store.reset();

    ({ alice, bob, charlie, nyc, sf } = await seedTestData(dataSource, store));
  });

  // -----------------------------------------------------------------------
  // Test 1: Happy path - 10 days, request 2, APPROVED, balance 8
  // -----------------------------------------------------------------------
  it('Test 1: Happy path - request 2 days from 10, APPROVED, balance becomes 8', async () => {
    const res = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 2 })
      .expect(201);

    expect(res.body.status).toBe('APPROVED');
    expect(res.body.hcmTransactionId).toBeTruthy();

    const bal = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: alice.id, locationId: nyc.id },
    });
    expect(Number(bal.balanceDays)).toBe(8);
  });

  // -----------------------------------------------------------------------
  // Test 2: GET balance returns correct data
  // -----------------------------------------------------------------------
  it('Test 2: GET /balances returns correct employee balance', async () => {
    const res = await request(app.getHttpServer())
      .get(`/balances/${alice.id}/${nyc.id}`)
      .expect(200);

    expect(Number(res.body.balanceDays)).toBe(10);
    expect(res.body.employeeId).toBe(alice.id);
    expect(res.body.locationId).toBe(nyc.id);
  });

  // -----------------------------------------------------------------------
  // Test 3: Batch sync inserts
  // -----------------------------------------------------------------------
  it('Test 3: Batch sync inserts new balances', async () => {
    await dataSource.getRepository(TimeOffBalance).clear();

    const res = await request(app.getHttpServer())
      .post('/sync/hcm/batch')
      .send([
        { employeeId: alice.id, locationId: nyc.id, balanceDays: 12 },
        { employeeId: bob.id, locationId: nyc.id, balanceDays: 8 },
      ])
      .expect(200);

    expect(res.body.inserted).toBe(2);
    expect(res.body.updated).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Test 4: Batch sync updates
  // -----------------------------------------------------------------------
  it('Test 4: Batch sync updates existing balances', async () => {
    const res = await request(app.getHttpServer())
      .post('/sync/hcm/batch')
      .send([
        { employeeId: alice.id, locationId: nyc.id, balanceDays: 20 },
        { employeeId: bob.id, locationId: nyc.id, balanceDays: 15 },
      ])
      .expect(200);

    expect(res.body.updated).toBe(2);
    expect(res.body.inserted).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Test 5: Reject days = 0
  // -----------------------------------------------------------------------
  it('Test 5: Rejects requestedDays = 0', async () => {
    const res = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 0 })
      .expect(400);

    expect(res.body.message).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // Test 6: Reject days < 0
  // -----------------------------------------------------------------------
  it('Test 6: Rejects requestedDays < 0', async () => {
    const res = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: -3 })
      .expect(400);

    expect(res.body.message).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // Test 7: Reject nonexistent employee
  // -----------------------------------------------------------------------
  it('Test 7: Rejects request for nonexistent employee', async () => {
    const res = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({
        employeeId: '00000000-0000-0000-0000-000000000000',
        locationId: nyc.id,
        requestedDays: 2,
      })
      .expect(404);

    expect(res.body.message).toContain('not found');
  });

  // -----------------------------------------------------------------------
  // Test 8: Reject nonexistent location
  // -----------------------------------------------------------------------
  it('Test 8: Rejects request for nonexistent location', async () => {
    const res = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({
        employeeId: alice.id,
        locationId: '00000000-0000-0000-0000-000000000000',
        requestedDays: 2,
      })
      .expect(404);

    expect(res.body.message).toContain('not found');
  });

  // -----------------------------------------------------------------------
  // Test 9: Reject inactive employee
  // -----------------------------------------------------------------------
  it('Test 9: Rejects request from inactive employee', async () => {
    const res = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: charlie.id, locationId: nyc.id, requestedDays: 2 })
      .expect(422);

    expect(res.body.message).toContain('inactive');
  });

  // -----------------------------------------------------------------------
  // Test 10: Reject inactive employee-location
  // -----------------------------------------------------------------------
  it('Test 10: Rejects request for inactive employee-location pairing', async () => {
    const res = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: bob.id, locationId: sf.id, requestedDays: 2 })
      .expect(422);

    expect(res.body.message).toContain('inactive');
  });

  // -----------------------------------------------------------------------
  // Test 11: Reject insufficient local balance (before HCM check)
  // -----------------------------------------------------------------------
  it('Test 11: Rejects when local balance is insufficient before HCM check', async () => {
    // Alice has 10 days locally, request 15
    const res = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 15 })
      .expect(422);

    expect(res.body.message).toContain('Insufficient balance');
  });

  // -----------------------------------------------------------------------
  // Test 12: Reject after realtime HCM shows insufficient balance
  // -----------------------------------------------------------------------
  it('Test 12: Rejects after HCM realtime shows lower balance', async () => {
    // Update HCM store to have only 5 days
    store.setBalance(alice.id, nyc.id, 5);

    const res = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 8 })
      .expect(422);

    expect(res.body.message).toContain('Insufficient balance');

    // Local balance should be updated to match HCM
    const bal = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: alice.id, locationId: nyc.id },
    });
    expect(Number(bal.balanceDays)).toBe(5);
  });

  // -----------------------------------------------------------------------
  // Test 13: Reconcile: local=10, HCM=15 → local becomes 15
  // -----------------------------------------------------------------------
  it('Test 13: Reconcile updates local balance from HCM (10 → 15)', async () => {
    store.setBalance(alice.id, nyc.id, 15);

    const res = await request(app.getHttpServer())
      .post(`/sync/hcm/reconcile/${alice.id}/${nyc.id}`)
      .expect(200);

    expect(Number(res.body.balanceDays)).toBe(15);

    const bal = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: alice.id, locationId: nyc.id },
    });
    expect(Number(bal.balanceDays)).toBe(15);
  });

  // -----------------------------------------------------------------------
  // Test 14: Local=10, HCM=5 → request for 8 rejected
  // -----------------------------------------------------------------------
  it('Test 14: Local=10, HCM=5 → request for 8 rejected after sync', async () => {
    store.setBalance(alice.id, nyc.id, 5);

    const res = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 8 })
      .expect(422);

    expect(res.body.message).toContain('Insufficient balance');
  });

  // -----------------------------------------------------------------------
  // Test 15: Work anniversary refresh via mock admin (set balance to new value)
  // -----------------------------------------------------------------------
  it('Test 15: Work anniversary refresh - new balance available after store update', async () => {
    // Simulate work anniversary: HCM updates the employee's balance to 15
    store.setBalance(alice.id, nyc.id, 15);

    // Reconcile pulls the new HCM balance into local so the pre-check passes
    await request(app.getHttpServer())
      .post(`/sync/hcm/reconcile/${alice.id}/${nyc.id}`)
      .expect(200);

    // Now request 12 days (local is now 15, HCM is 15)
    const res = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 12 })
      .expect(201);

    expect(res.body.status).toBe('APPROVED');
  });

  // -----------------------------------------------------------------------
  // Test 16: Start-of-year refresh via batch sync
  // -----------------------------------------------------------------------
  it('Test 16: Start-of-year refresh via batch sync sets new balances', async () => {
    // Simulate year-end: HCM already has the new balances (the batch data comes FROM HCM)
    store.setBalance(alice.id, nyc.id, 20);
    store.setBalance(bob.id, nyc.id, 20);

    const res = await request(app.getHttpServer())
      .post('/sync/hcm/batch')
      .send([
        { employeeId: alice.id, locationId: nyc.id, balanceDays: 20 },
        { employeeId: bob.id, locationId: nyc.id, balanceDays: 20 },
      ])
      .expect(200);

    expect(res.body.updated).toBe(2);

    // Now request using the new balance (local=20, HCM=20)
    const reqRes = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 18 })
      .expect(201);

    expect(reqRes.body.status).toBe('APPROVED');
  });

  // -----------------------------------------------------------------------
  // Test 17: HCM unreliableValidation mode: local check still rejects
  // -----------------------------------------------------------------------
  it('Test 17: unreliableValidation mode - local check still rejects insufficient balance', async () => {
    store.setMode('unreliableValidation');

    // Alice has 10 locally, request 15
    const res = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 15 })
      .expect(422);

    expect(res.body.message).toContain('Insufficient balance');
  });

  // -----------------------------------------------------------------------
  // Test 18: HCM returns no transaction ID → APPROVED_WITH_WARNING
  // -----------------------------------------------------------------------
  it('Test 18: APPROVED_WITH_WARNING when HCM returns no transactionId', async () => {
    const originalDeduct = store.deductBalance.bind(store);
    store.deductBalance = () => ({ success: true, transactionId: undefined });

    const res = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 2 })
      .expect(201);

    store.deductBalance = originalDeduct;

    expect(res.body.status).toBe('APPROVED_WITH_WARNING');
    expect(res.body.hcmTransactionId).toBeNull();

    // Balance should still be deducted locally
    const bal = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: alice.id, locationId: nyc.id },
    });
    expect(Number(bal.balanceDays)).toBe(8);
  });

  // -----------------------------------------------------------------------
  // Test 19: HCM timeout during balance check → FAILED
  // -----------------------------------------------------------------------
  it('Test 19: FAILED when HCM times out during balance check', async () => {
    store.setMode('timeout');

    const res = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 2 })
      .expect(201);

    expect(res.body.status).toBe('FAILED');
    expect(res.body.failureReason).toBeTruthy();

    // Balance NOT deducted
    const bal = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: alice.id, locationId: nyc.id },
    });
    expect(Number(bal.balanceDays)).toBe(10);
  });

  // -----------------------------------------------------------------------
  // Test 20: HCM timeout after submit → FAILED (no local deduction)
  // -----------------------------------------------------------------------
  it('Test 20: FAILED when HCM times out during submit (getBalance succeeds, submit times out)', async () => {
    const { HcmTimeoutError } = await import('../../src/common/exceptions');
    const originalDeduct = store.deductBalance.bind(store);

    // Patch deductBalance to throw HcmTimeoutError (simulating submit timeout)
    store.deductBalance = () => {
      throw new HcmTimeoutError('submitTimeOff');
    };

    const res = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 2 })
      .expect(201);

    store.deductBalance = originalDeduct;

    expect(res.body.status).toBe('FAILED');
    expect(res.body.failureReason).toBeTruthy();

    // Balance NOT deducted
    const bal = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: alice.id, locationId: nyc.id },
    });
    expect(Number(bal.balanceDays)).toBe(10);
  });

  // -----------------------------------------------------------------------
  // Test 21: HCM server error during batch sync → existing balances unchanged
  // -----------------------------------------------------------------------
  it('Test 21: HCM server error during batch (uses direct data, no HCM call needed)', async () => {
    // Batch sync does NOT call HCM client - it receives the payload directly
    // So we test that a bad payload doesn't corrupt existing data
    const resBefore = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: alice.id, locationId: nyc.id },
    });
    expect(Number(resBefore.balanceDays)).toBe(10);

    // Send batch with only negative balance (quarantined, no updates to alice)
    await request(app.getHttpServer())
      .post('/sync/hcm/batch')
      .send([
        { employeeId: 'unknown-emp', locationId: 'unknown-loc', balanceDays: -1 },
      ])
      .expect(200);

    // Alice's balance was marked missing but not changed
    const resAfter = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: alice.id, locationId: nyc.id },
    });
    expect(resAfter.missingFromLatestBatch).toBe(true);
    expect(Number(resAfter.balanceDays)).toBe(10);
  });

  // -----------------------------------------------------------------------
  // Test 22: Concurrency - 10 days, two requests for 7 → only one approved
  // -----------------------------------------------------------------------
  it('Test 22: Concurrency - only one of two 7-day requests is approved with 10-day balance', async () => {
    const [r1, r2] = await Promise.all([
      request(app.getHttpServer())
        .post('/time-off-requests')
        .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 7 }),
      request(app.getHttpServer())
        .post('/time-off-requests')
        .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 7 }),
    ]);

    // One should be APPROVED (status 201), the other REJECTED with 422
    const approved = [r1, r2].filter(
      (r) => r.status === 201 && r.body.status === 'APPROVED',
    );
    expect(approved.length).toBe(1);

    // Balance should not go negative
    const bal = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: alice.id, locationId: nyc.id },
    });
    expect(Number(bal.balanceDays)).toBeGreaterThanOrEqual(0);
    expect(Number(bal.balanceDays)).toBe(3); // 10 - 7
  });

  // -----------------------------------------------------------------------
  // Test 23: Duplicate idempotency key → same result
  // -----------------------------------------------------------------------
  it('Test 23: Duplicate idempotency key returns same request without re-processing', async () => {
    const key = `idem-${Date.now()}`;

    const r1 = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 2, idempotencyKey: key })
      .expect(201);

    const r2 = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 2, idempotencyKey: key })
      .expect(201);

    expect(r1.body.id).toBe(r2.body.id);

    // Balance deducted only once
    const bal = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: alice.id, locationId: nyc.id },
    });
    expect(Number(bal.balanceDays)).toBe(8);
  });

  // -----------------------------------------------------------------------
  // Test 24: Retry after failed HCM call
  // -----------------------------------------------------------------------
  it('Test 24: Retry after failed HCM call succeeds when HCM recovers', async () => {
    // First attempt: HCM times out
    store.setMode('timeout');
    const failRes = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 2 })
      .expect(201);

    expect(failRes.body.status).toBe('FAILED');

    // Reset HCM to normal
    store.setMode('normal');

    // Retry: should succeed
    const successRes = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 2 })
      .expect(201);

    expect(successRes.body.status).toBe('APPROVED');

    // Balance should be 8 (only one successful deduction)
    const bal = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: alice.id, locationId: nyc.id },
    });
    expect(Number(bal.balanceDays)).toBe(8);
  });

  // -----------------------------------------------------------------------
  // Test 25: Batch sync: new pair inserted
  // -----------------------------------------------------------------------
  it('Test 25: Batch sync inserts a new employee-location pair', async () => {
    const res = await request(app.getHttpServer())
      .post('/sync/hcm/batch')
      .send([
        { employeeId: alice.id, locationId: nyc.id, balanceDays: 10 }, // existing
        { employeeId: alice.id, locationId: sf.id, balanceDays: 7 },  // new
      ])
      .expect(200);

    expect(res.body.inserted).toBe(1); // sf is new
    expect(res.body.updated).toBe(1); // nyc already existed

    const sfBalance = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: alice.id, locationId: sf.id },
    });
    expect(Number(sfBalance.balanceDays)).toBe(7);
  });

  // -----------------------------------------------------------------------
  // Test 26: Batch sync: omitted pair marked missing
  // -----------------------------------------------------------------------
  it('Test 26: Batch sync marks omitted pairs as missingFromLatestBatch', async () => {
    // Only include alice in batch, bob will be missing
    await request(app.getHttpServer())
      .post('/sync/hcm/batch')
      .send([{ employeeId: alice.id, locationId: nyc.id, balanceDays: 10 }])
      .expect(200);

    const bobBal = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: bob.id, locationId: nyc.id },
    });
    expect(bobBal.missingFromLatestBatch).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Test 27: Batch sync: duplicate records handled deterministically
  // -----------------------------------------------------------------------
  it('Test 27: Batch sync handles duplicate records - last value wins', async () => {
    await dataSource.getRepository(TimeOffBalance).clear();

    const res = await request(app.getHttpServer())
      .post('/sync/hcm/batch')
      .send([
        { employeeId: alice.id, locationId: nyc.id, balanceDays: 5 },
        { employeeId: alice.id, locationId: nyc.id, balanceDays: 15 }, // duplicate - wins
      ])
      .expect(200);

    expect(res.body.skipped).toBe(1);
    expect(res.body.inserted).toBe(1);

    const bal = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: alice.id, locationId: nyc.id },
    });
    expect(Number(bal.balanceDays)).toBe(15);
  });

  // -----------------------------------------------------------------------
  // Test 28: Batch sync: negative balance quarantined
  // -----------------------------------------------------------------------
  it('Test 28: Batch sync quarantines negative balances', async () => {
    const res = await request(app.getHttpServer())
      .post('/sync/hcm/batch')
      .send([
        { employeeId: alice.id, locationId: nyc.id, balanceDays: -2 },
      ])
      .expect(200);

    expect(res.body.quarantined).toBe(1);

    // Alice's local balance should remain unchanged
    const bal = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: alice.id, locationId: nyc.id },
    });
    expect(Number(bal.balanceDays)).toBe(10); // unchanged
  });

  // -----------------------------------------------------------------------
  // Test 29: Decimal balances work (request 1.5 days)
  // -----------------------------------------------------------------------
  it('Test 29: Decimal balances work correctly (request 1.5 days from 10)', async () => {
    const res = await request(app.getHttpServer())
      .post('/time-off-requests')
      .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 1.5 })
      .expect(201);

    expect(res.body.status).toBe('APPROVED');

    const bal = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: alice.id, locationId: nyc.id },
    });
    expect(Number(bal.balanceDays)).toBe(8.5);
  });

  // -----------------------------------------------------------------------
  // Test 30: Local balance never goes negative
  // -----------------------------------------------------------------------
  it('Test 30: Local balance never goes negative even under concurrent requests', async () => {
    // Alice has 10 days - send 4 concurrent requests for 4 days each.
    // Only 2 can succeed (floor(10/4) = 2). Use allSettled so a connection
    // reset from one request doesn't abort the whole assertion.
    const settled = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        request(app.getHttpServer())
          .post('/time-off-requests')
          .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 4 })
          .timeout(12000),
      ),
    );

    const approved = settled
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<any>).value)
      .filter((r) => r.status === 201 && r.body.status === 'APPROVED');

    const bal = await dataSource.getRepository(TimeOffBalance).findOne({
      where: { employeeId: alice.id, locationId: nyc.id },
    });

    // Balance must never go negative
    expect(Number(bal.balanceDays)).toBeGreaterThanOrEqual(0);
    // At most 2 requests can be approved (floor(10/4) = 2)
    expect(approved.length).toBeLessThanOrEqual(2);
  }, 30000);
});
