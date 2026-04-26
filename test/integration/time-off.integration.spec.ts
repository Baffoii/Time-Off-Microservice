import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedTestData } from '../helpers/test-app.helper';
import { MockHcmStore } from '../../src/mock-hcm/mock-hcm-store';
import { TimeOffBalance } from '../../src/database/entities/time-off-balance.entity';
import { TimeOffRequest } from '../../src/database/entities/time-off-request.entity';

describe('TimeOff Integration Tests', () => {
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
    // Clear tables
    await dataSource.getRepository(TimeOffRequest).clear();
    await dataSource.getRepository(TimeOffBalance).clear();
    const entities = ['employee_location', 'location', 'employee'];
    for (const e of entities) {
      await dataSource.query(`DELETE FROM "${e}"`);
    }
    store.reset();

    ({ alice, bob, charlie, nyc, sf } = await seedTestData(dataSource, store));
  });

  describe('Full request flow', () => {
    it('approves a valid time-off request and deducts balance', async () => {
      const res = await request(app.getHttpServer())
        .post('/time-off-requests')
        .send({
          employeeId: alice.id,
          locationId: nyc.id,
          requestedDays: 2,
        })
        .expect(201);

      expect(res.body.status).toBe('APPROVED');
      expect(res.body.hcmTransactionId).toBeTruthy();

      // Verify local balance was deducted
      const balance = await dataSource.getRepository(TimeOffBalance).findOne({
        where: { employeeId: alice.id, locationId: nyc.id },
      });
      expect(Number(balance.balanceDays)).toBe(8);
    });

    it('rejects when employee does not exist', async () => {
      const res = await request(app.getHttpServer())
        .post('/time-off-requests')
        .send({
          employeeId: 'non-existent-id',
          locationId: nyc.id,
          requestedDays: 2,
        })
        .expect(404);

      expect(res.body.message).toContain('not found');
    });

    it('rejects when balance is insufficient', async () => {
      const res = await request(app.getHttpServer())
        .post('/time-off-requests')
        .send({
          employeeId: alice.id,
          locationId: nyc.id,
          requestedDays: 15,
        })
        .expect(422);

      expect(res.body.message).toContain('Insufficient balance');
    });

    it('rejects inactive employee', async () => {
      const res = await request(app.getHttpServer())
        .post('/time-off-requests')
        .send({
          employeeId: charlie.id,
          locationId: nyc.id,
          requestedDays: 2,
        })
        .expect(422);

      expect(res.body.message).toContain('inactive');
    });

    it('rejects inactive employee-location pairing', async () => {
      const res = await request(app.getHttpServer())
        .post('/time-off-requests')
        .send({
          employeeId: bob.id,
          locationId: sf.id,
          requestedDays: 2,
        })
        .expect(422);

      expect(res.body.message).toContain('inactive');
    });
  });

  describe('Idempotency', () => {
    it('returns same result for duplicate idempotency key', async () => {
      const firstRes = await request(app.getHttpServer())
        .post('/time-off-requests')
        .send({
          employeeId: alice.id,
          locationId: nyc.id,
          requestedDays: 2,
          idempotencyKey: 'test-idem-1',
        })
        .expect(201);

      // Balance should now be 8
      const secondRes = await request(app.getHttpServer())
        .post('/time-off-requests')
        .send({
          employeeId: alice.id,
          locationId: nyc.id,
          requestedDays: 2,
          idempotencyKey: 'test-idem-1',
        })
        .expect(201);

      // Same request ID
      expect(firstRes.body.id).toBe(secondRes.body.id);

      // Balance should still be 8 (not deducted twice)
      const balance = await dataSource.getRepository(TimeOffBalance).findOne({
        where: { employeeId: alice.id, locationId: nyc.id },
      });
      expect(Number(balance.balanceDays)).toBe(8);
    });
  });

  describe('Concurrency', () => {
    it('only one of two simultaneous requests for same balance should succeed when balance is tight', async () => {
      // Alice has 10 days, two requests for 7 days each
      const [r1, r2] = await Promise.all([
        request(app.getHttpServer())
          .post('/time-off-requests')
          .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 7 }),
        request(app.getHttpServer())
          .post('/time-off-requests')
          .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 7 }),
      ]);

      const statuses = [r1.body.status, r2.body.status];

      // At least one should be approved
      expect(statuses).toContain('APPROVED');

      // Balance should not go negative
      const balance = await dataSource.getRepository(TimeOffBalance).findOne({
        where: { employeeId: alice.id, locationId: nyc.id },
      });
      expect(Number(balance.balanceDays)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('HCM failure modes', () => {
    it('creates FAILED request when HCM times out', async () => {
      store.setMode('timeout');

      const res = await request(app.getHttpServer())
        .post('/time-off-requests')
        .send({
          employeeId: alice.id,
          locationId: nyc.id,
          requestedDays: 2,
        })
        .expect(201);

      expect(res.body.status).toBe('FAILED');
      expect(res.body.failureReason).toBeTruthy();

      // Balance should NOT be deducted on FAILED
      const balance = await dataSource.getRepository(TimeOffBalance).findOne({
        where: { employeeId: alice.id, locationId: nyc.id },
      });
      expect(Number(balance.balanceDays)).toBe(10);
    });

    it('returns APPROVED_WITH_WARNING when HCM returns no transaction ID', async () => {
      // We need to override the mock to return null transactionId
      // Use a custom store behavior
      const originalDeduct = store.deductBalance.bind(store);
      store.deductBalance = () => ({ success: true, transactionId: undefined });

      const res = await request(app.getHttpServer())
        .post('/time-off-requests')
        .send({
          employeeId: alice.id,
          locationId: nyc.id,
          requestedDays: 2,
        })
        .expect(201);

      store.deductBalance = originalDeduct;
      expect(res.body.status).toBe('APPROVED_WITH_WARNING');
    });
  });

  describe('GET endpoints', () => {
    it('retrieves a time-off request by ID', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/time-off-requests')
        .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 1 })
        .expect(201);

      const getRes = await request(app.getHttpServer())
        .get(`/time-off-requests/${createRes.body.id}`)
        .expect(200);

      expect(getRes.body.id).toBe(createRes.body.id);
    });

    it('filters requests by employeeId', async () => {
      await request(app.getHttpServer())
        .post('/time-off-requests')
        .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 1 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/time-off-requests?employeeId=${alice.id}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((r: any) => r.employeeId === alice.id)).toBe(true);
    });
  });
});
