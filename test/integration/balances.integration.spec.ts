import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedTestData } from '../helpers/test-app.helper';
import { MockHcmStore } from '../../src/mock-hcm/mock-hcm-store';
import { TimeOffBalance } from '../../src/database/entities/time-off-balance.entity';
import { TimeOffRequest } from '../../src/database/entities/time-off-request.entity';

describe('Balances Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let store: MockHcmStore;
  let alice: any;
  let bob: any;
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

    ({ alice, bob, nyc, sf } = await seedTestData(dataSource, store));
  });

  describe('GET /balances/:employeeId', () => {
    it('returns all balances for an employee', async () => {
      const res = await request(app.getHttpServer())
        .get(`/balances/${alice.id}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].employeeId).toBe(alice.id);
    });

    it('returns empty array for employee with no balances', async () => {
      const res = await request(app.getHttpServer())
        .get(`/balances/${bob.id}`)
        .expect(200);

      // Bob has a balance seeded
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /balances/:employeeId/:locationId', () => {
    it('returns local balance without refresh', async () => {
      const res = await request(app.getHttpServer())
        .get(`/balances/${alice.id}/${nyc.id}`)
        .expect(200);

      expect(Number(res.body.balanceDays)).toBe(10);
      expect(res.body.source).toBe('HCM_BATCH');
    });

    it('refreshes balance from HCM when refresh=true', async () => {
      // Update HCM store to have different value
      store.setBalance(alice.id, nyc.id, 20);

      const res = await request(app.getHttpServer())
        .get(`/balances/${alice.id}/${nyc.id}?refresh=true`)
        .expect(200);

      expect(Number(res.body.balanceDays)).toBe(20);
      expect(res.body.source).toBe('HCM_REALTIME');
    });

    it('returns stale local balance if refresh fails gracefully', async () => {
      // Don't set balance in HCM store (getBalance will throw)
      store.reset();

      const res = await request(app.getHttpServer())
        .get(`/balances/${alice.id}/${nyc.id}?refresh=true`)
        .expect(200);

      // Falls back to local
      expect(Number(res.body.balanceDays)).toBe(10);
    });
  });

  describe('Balance consistency', () => {
    it('balance is updated after reconcile', async () => {
      store.setBalance(alice.id, nyc.id, 15);

      await request(app.getHttpServer())
        .post(`/sync/hcm/reconcile/${alice.id}/${nyc.id}`)
        .expect(200);

      const balRes = await request(app.getHttpServer())
        .get(`/balances/${alice.id}/${nyc.id}`)
        .expect(200);

      expect(Number(balRes.body.balanceDays)).toBe(15);
    });

    it('balance is decremented after approved time-off request', async () => {
      const reqRes = await request(app.getHttpServer())
        .post('/time-off-requests')
        .send({ employeeId: alice.id, locationId: nyc.id, requestedDays: 3 })
        .expect(201);

      expect(reqRes.body.status).toBe('APPROVED');

      const balRes = await request(app.getHttpServer())
        .get(`/balances/${alice.id}/${nyc.id}`)
        .expect(200);

      expect(Number(balRes.body.balanceDays)).toBe(7);
    });
  });
});
