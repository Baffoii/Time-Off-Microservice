import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedTestData } from '../helpers/test-app.helper';
import { MockHcmStore } from '../../src/mock-hcm/mock-hcm-store';
import { TimeOffBalance } from '../../src/database/entities/time-off-balance.entity';
import { TimeOffRequest } from '../../src/database/entities/time-off-request.entity';

describe('Sync Integration Tests', () => {
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

  describe('batchSync', () => {
    it('inserts new balances via batch sync', async () => {
      // Clear existing balances
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

      const aliceBalance = await dataSource.getRepository(TimeOffBalance).findOne({
        where: { employeeId: alice.id, locationId: nyc.id },
      });
      expect(Number(aliceBalance.balanceDays)).toBe(12);
    });

    it('updates existing balances via batch sync', async () => {
      const res = await request(app.getHttpServer())
        .post('/sync/hcm/batch')
        .send([
          { employeeId: alice.id, locationId: nyc.id, balanceDays: 20 },
          { employeeId: bob.id, locationId: nyc.id, balanceDays: 15 },
        ])
        .expect(200);

      expect(res.body.updated).toBe(2);
      expect(res.body.inserted).toBe(0);

      const aliceBalance = await dataSource.getRepository(TimeOffBalance).findOne({
        where: { employeeId: alice.id, locationId: nyc.id },
      });
      expect(Number(aliceBalance.balanceDays)).toBe(20);
    });

    it('marks omitted pairs as missingFromLatestBatch', async () => {
      // Only send alice's balance, bob's should be marked missing
      const res = await request(app.getHttpServer())
        .post('/sync/hcm/batch')
        .send([
          { employeeId: alice.id, locationId: nyc.id, balanceDays: 10 },
        ])
        .expect(200);

      expect(res.body.stillMissing).toBe(1);

      const bobBalance = await dataSource.getRepository(TimeOffBalance).findOne({
        where: { employeeId: bob.id, locationId: nyc.id },
      });
      expect(bobBalance.missingFromLatestBatch).toBe(true);
    });

    it('quarantines negative balance records', async () => {
      const res = await request(app.getHttpServer())
        .post('/sync/hcm/batch')
        .send([
          { employeeId: alice.id, locationId: nyc.id, balanceDays: -5 },
          { employeeId: bob.id, locationId: nyc.id, balanceDays: 10 },
        ])
        .expect(200);

      expect(res.body.quarantined).toBe(1);
      expect(res.body.updated).toBe(1);
    });

    it('handles duplicate records (last-wins)', async () => {
      // Clear existing
      await dataSource.getRepository(TimeOffBalance).clear();

      const res = await request(app.getHttpServer())
        .post('/sync/hcm/batch')
        .send([
          { employeeId: alice.id, locationId: nyc.id, balanceDays: 10 },
          { employeeId: alice.id, locationId: nyc.id, balanceDays: 25 }, // duplicate, wins
        ])
        .expect(200);

      expect(res.body.skipped).toBe(1);
      expect(res.body.inserted).toBe(1);

      const balance = await dataSource.getRepository(TimeOffBalance).findOne({
        where: { employeeId: alice.id, locationId: nyc.id },
      });
      expect(Number(balance.balanceDays)).toBe(25);
    });
  });

  describe('reconcile', () => {
    it('updates local balance from HCM realtime', async () => {
      // Set HCM store to have different value
      store.setBalance(alice.id, nyc.id, 18);

      const res = await request(app.getHttpServer())
        .post(`/sync/hcm/reconcile/${alice.id}/${nyc.id}`)
        .expect(200);

      expect(Number(res.body.balanceDays)).toBe(18);
      expect(res.body.source).toBe('HCM_REALTIME');

      const localBalance = await dataSource.getRepository(TimeOffBalance).findOne({
        where: { employeeId: alice.id, locationId: nyc.id },
      });
      expect(Number(localBalance.balanceDays)).toBe(18);
    });

    it('creates new balance when reconciling a new pair', async () => {
      // Add sf balance to HCM store
      store.setBalance(alice.id, sf.id, 7);

      const res = await request(app.getHttpServer())
        .post(`/sync/hcm/reconcile/${alice.id}/${sf.id}`)
        .expect(200);

      expect(Number(res.body.balanceDays)).toBe(7);
      expect(res.body.source).toBe('HCM_REALTIME');
    });

    it('propagates error when HCM does not have the balance', async () => {
      // Don't set any balance for this pair in the store
      const res = await request(app.getHttpServer())
        .post(`/sync/hcm/reconcile/${alice.id}/non-existent-loc`)
        .expect(404);
    });
  });
});
