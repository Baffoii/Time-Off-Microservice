import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SyncService } from '../../src/sync/sync.service';
import { TimeOffBalance } from '../../src/database/entities/time-off-balance.entity';
import { HcmClientService } from '../../src/hcm-client/hcm-client.service';

describe('SyncService', () => {
  let service: SyncService;
  let balanceRepo: any;
  let hcmClient: jest.Mocked<HcmClientService>;
  let dataSource: any;

  const makeBalance = (overrides: Partial<TimeOffBalance> = {}): TimeOffBalance => ({
    id: 'bal-1',
    employeeId: 'emp-1',
    locationId: 'loc-1',
    balanceDays: 10,
    source: 'HCM_BATCH',
    lastSyncedAt: new Date(),
    missingFromLatestBatch: false,
    updatedAt: new Date(),
    employee: null,
    location: null,
    ...overrides,
  });

  function setupTransactionMock(
    existingBalances: Map<string, TimeOffBalance>,
  ) {
    dataSource.transaction.mockImplementation(async (cb: Function) => {
      const saved: TimeOffBalance[] = [];

      const qbMock = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockImplementation(async () => {
          // Simulate marking all rows missingFromLatestBatch=true
          for (const [, b] of existingBalances) {
            b.missingFromLatestBatch = true;
          }
        }),
      };

      const manager = {
        createQueryBuilder: jest.fn().mockReturnValue(qbMock),
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockImplementation(async ({ where }) => {
            const key = `${where.employeeId}:${where.locationId}`;
            return existingBalances.get(key) || null;
          }),
          create: jest.fn().mockImplementation((data) => ({ ...data })),
          save: jest.fn().mockImplementation(async (bal) => {
            const key = `${bal.employeeId}:${bal.locationId}`;
            existingBalances.set(key, bal);
            saved.push(bal);
            return bal;
          }),
        }),
      };
      return cb(manager);
    });
  }

  beforeEach(async () => {
    balanceRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };

    const mockHcmClient = {
      getBalance: jest.fn(),
      submitTimeOff: jest.fn(),
      getBatchBalances: jest.fn(),
    };

    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: getRepositoryToken(TimeOffBalance), useValue: balanceRepo },
        { provide: HcmClientService, useValue: mockHcmClient },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    hcmClient = module.get(HcmClientService);
  });

  describe('batchSync', () => {
    it('inserts new balances when none exist', async () => {
      const existingBalances = new Map<string, TimeOffBalance>();
      setupTransactionMock(existingBalances);
      balanceRepo.count.mockResolvedValue(0);

      const result = await service.batchSync([
        { employeeId: 'emp-1', locationId: 'loc-1', balanceDays: 10 },
        { employeeId: 'emp-2', locationId: 'loc-1', balanceDays: 5 },
      ]);

      expect(result.inserted).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.quarantined).toBe(0);
    });

    it('updates existing balances', async () => {
      const existingBalance = makeBalance({ balanceDays: 10 });
      const existingBalances = new Map([['emp-1:loc-1', existingBalance]]);
      setupTransactionMock(existingBalances);
      balanceRepo.count.mockResolvedValue(0);

      const result = await service.batchSync([
        { employeeId: 'emp-1', locationId: 'loc-1', balanceDays: 15 },
      ]);

      expect(result.updated).toBe(1);
      expect(result.inserted).toBe(0);
    });

    it('marks balances missing from batch', async () => {
      // Balance emp-2:loc-1 exists but is not in the batch
      const existing = makeBalance({ employeeId: 'emp-2', locationId: 'loc-1' });
      const existingBalances = new Map([['emp-2:loc-1', existing]]);
      setupTransactionMock(existingBalances);
      // After transaction, the missing balance remains with missingFromLatestBatch=true
      balanceRepo.count.mockResolvedValue(1);

      const result = await service.batchSync([
        { employeeId: 'emp-1', locationId: 'loc-1', balanceDays: 10 },
      ]);

      expect(result.stillMissing).toBe(1);
    });

    it('quarantines negative balance records', async () => {
      const existingBalances = new Map<string, TimeOffBalance>();
      setupTransactionMock(existingBalances);
      balanceRepo.count.mockResolvedValue(0);

      const result = await service.batchSync([
        { employeeId: 'emp-1', locationId: 'loc-1', balanceDays: -5 },
        { employeeId: 'emp-2', locationId: 'loc-1', balanceDays: 10 },
      ]);

      expect(result.quarantined).toBe(1);
      expect(result.inserted).toBe(1);
    });

    it('handles duplicate records deterministically (last-wins)', async () => {
      const existingBalances = new Map<string, TimeOffBalance>();
      setupTransactionMock(existingBalances);
      balanceRepo.count.mockResolvedValue(0);

      const result = await service.batchSync([
        { employeeId: 'emp-1', locationId: 'loc-1', balanceDays: 10 },
        { employeeId: 'emp-1', locationId: 'loc-1', balanceDays: 20 }, // duplicate
      ]);

      // One skipped (duplicate), one inserted
      expect(result.skipped).toBe(1); // first occurrence counted as skipped
      expect(result.inserted).toBe(1);
      // The last value (20) wins
      expect(existingBalances.get('emp-1:loc-1')?.balanceDays).toBe(20);
    });

    it('returns correct summary with all fields', async () => {
      const existingBalance = makeBalance({ balanceDays: 5 });
      const existingBalances = new Map([['emp-1:loc-1', existingBalance]]);
      setupTransactionMock(existingBalances);
      balanceRepo.count.mockResolvedValue(0);

      const result = await service.batchSync([
        { employeeId: 'emp-1', locationId: 'loc-1', balanceDays: 10 }, // update
        { employeeId: 'emp-new', locationId: 'loc-1', balanceDays: 5 }, // insert
        { employeeId: 'emp-bad', locationId: 'loc-1', balanceDays: -1 }, // quarantine
      ]);

      expect(result).toMatchObject({
        updated: 1,
        inserted: 1,
        quarantined: 1,
        stillMissing: 0,
      });
    });
  });

  describe('reconcile', () => {
    it('updates local balance from HCM realtime', async () => {
      const existing = makeBalance({ balanceDays: 10 });
      hcmClient.getBalance.mockResolvedValue({ balanceDays: 15 });
      balanceRepo.findOne.mockResolvedValue(existing);
      balanceRepo.save.mockResolvedValue({ ...existing, balanceDays: 15, source: 'HCM_REALTIME' });

      const result = await service.reconcile('emp-1', 'loc-1');

      expect(hcmClient.getBalance).toHaveBeenCalledWith('emp-1', 'loc-1');
      expect(balanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ balanceDays: 15, source: 'HCM_REALTIME' }),
      );
    });

    it('creates new balance when none exists locally', async () => {
      hcmClient.getBalance.mockResolvedValue({ balanceDays: 8 });
      balanceRepo.findOne.mockResolvedValue(null);
      const newBalance = makeBalance({ balanceDays: 8, source: 'HCM_REALTIME' });
      balanceRepo.create.mockReturnValue(newBalance);
      balanceRepo.save.mockResolvedValue(newBalance);

      const result = await service.reconcile('emp-new', 'loc-1');

      expect(balanceRepo.create).toHaveBeenCalled();
      expect(balanceRepo.save).toHaveBeenCalled();
    });

    it('propagates HCM errors', async () => {
      hcmClient.getBalance.mockRejectedValue(new Error('HCM unavailable'));

      await expect(service.reconcile('emp-1', 'loc-1')).rejects.toThrow('HCM unavailable');
    });
  });
});
