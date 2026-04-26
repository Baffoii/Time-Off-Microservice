import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BalancesService } from '../../src/balances/balances.service';
import { TimeOffBalance } from '../../src/database/entities/time-off-balance.entity';
import { HcmClientService } from '../../src/hcm-client/hcm-client.service';

describe('BalancesService', () => {
  let service: BalancesService;
  let balanceRepo: jest.Mocked<Repository<TimeOffBalance>>;
  let hcmClient: jest.Mocked<HcmClientService>;

  const mockBalance: TimeOffBalance = {
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
  };

  beforeEach(async () => {
    const mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const mockHcmClient = {
      getBalance: jest.fn(),
      submitTimeOff: jest.fn(),
      getBatchBalances: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalancesService,
        {
          provide: getRepositoryToken(TimeOffBalance),
          useValue: mockRepo,
        },
        {
          provide: HcmClientService,
          useValue: mockHcmClient,
        },
      ],
    }).compile();

    service = module.get<BalancesService>(BalancesService);
    balanceRepo = module.get(getRepositoryToken(TimeOffBalance));
    hcmClient = module.get(HcmClientService);
  });

  describe('getByEmployee', () => {
    it('returns all balances for an employee', async () => {
      balanceRepo.find.mockResolvedValue([mockBalance]);

      const result = await service.getByEmployee('emp-1');

      expect(result).toEqual([mockBalance]);
      expect(balanceRepo.find).toHaveBeenCalledWith({
        where: { employeeId: 'emp-1' },
      });
    });

    it('returns empty array when no balances found', async () => {
      balanceRepo.find.mockResolvedValue([]);

      const result = await service.getByEmployee('emp-unknown');

      expect(result).toEqual([]);
    });
  });

  describe('getByEmployeeAndLocation', () => {
    it('returns local balance without calling HCM when refresh=false', async () => {
      balanceRepo.findOne.mockResolvedValue(mockBalance);

      const result = await service.getByEmployeeAndLocation('emp-1', 'loc-1', false);

      expect(result).toEqual(mockBalance);
      expect(hcmClient.getBalance).not.toHaveBeenCalled();
    });

    it('fetches from HCM and updates local when refresh=true', async () => {
      hcmClient.getBalance.mockResolvedValue({ balanceDays: 15 });
      balanceRepo.findOne
        .mockResolvedValueOnce(mockBalance) // first call in upsert
        .mockResolvedValueOnce({ ...mockBalance, balanceDays: 15 }); // second call return
      balanceRepo.save.mockResolvedValue({ ...mockBalance, balanceDays: 15 });

      const result = await service.getByEmployeeAndLocation('emp-1', 'loc-1', true);

      expect(hcmClient.getBalance).toHaveBeenCalledWith('emp-1', 'loc-1');
      expect(balanceRepo.save).toHaveBeenCalled();
    });

    it('still returns local balance when HCM fails during refresh', async () => {
      hcmClient.getBalance.mockRejectedValue(new Error('HCM unavailable'));
      balanceRepo.findOne.mockResolvedValue(mockBalance);

      const result = await service.getByEmployeeAndLocation('emp-1', 'loc-1', true);

      expect(result).toEqual(mockBalance);
    });

    it('returns null when no balance exists', async () => {
      balanceRepo.findOne.mockResolvedValue(null);

      const result = await service.getByEmployeeAndLocation('emp-1', 'loc-missing');

      expect(result).toBeNull();
    });
  });

  describe('upsertBalance', () => {
    it('updates existing balance', async () => {
      balanceRepo.findOne.mockResolvedValue(mockBalance);
      balanceRepo.save.mockResolvedValue({ ...mockBalance, balanceDays: 20 });

      const result = await service.upsertBalance('emp-1', 'loc-1', 20, 'HCM_REALTIME');

      expect(balanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ balanceDays: 20, source: 'HCM_REALTIME' }),
      );
    });

    it('creates new balance when none exists', async () => {
      balanceRepo.findOne.mockResolvedValue(null);
      balanceRepo.create.mockReturnValue({ ...mockBalance, balanceDays: 20 } as any);
      balanceRepo.save.mockResolvedValue({ ...mockBalance, balanceDays: 20 });

      await service.upsertBalance('emp-1', 'loc-new', 20, 'HCM_BATCH');

      expect(balanceRepo.create).toHaveBeenCalled();
      expect(balanceRepo.save).toHaveBeenCalled();
    });
  });
});
