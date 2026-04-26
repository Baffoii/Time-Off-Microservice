import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { TimeOffService } from '../../src/time-off/time-off.service';
import { TimeOffRequest } from '../../src/database/entities/time-off-request.entity';
import { TimeOffBalance } from '../../src/database/entities/time-off-balance.entity';
import { Employee } from '../../src/database/entities/employee.entity';
import { Location } from '../../src/database/entities/location.entity';
import { EmployeeLocation } from '../../src/database/entities/employee-location.entity';
import { HcmClientService } from '../../src/hcm-client/hcm-client.service';
import {
  EmployeeNotFoundException,
  LocationNotFoundException,
  InactiveEmployeeException,
  InactiveEmployeeLocationException,
  InsufficientBalanceException,
  HcmTimeoutError,
} from '../../src/common/exceptions';

describe('TimeOffService', () => {
  let service: TimeOffService;
  let requestRepo: any;
  let balanceRepo: any;
  let employeeRepo: any;
  let locationRepo: any;
  let employeeLocationRepo: any;
  let hcmClient: jest.Mocked<HcmClientService>;
  let dataSource: any;

  const activeEmployee: Employee = {
    id: 'emp-1',
    name: 'Alice',
    status: 'ACTIVE',
    employeeLocations: [],
    balances: [],
    requests: [],
  };

  const inactiveEmployee: Employee = {
    id: 'emp-inactive',
    name: 'Bob',
    status: 'INACTIVE',
    employeeLocations: [],
    balances: [],
    requests: [],
  };

  const location: Location = {
    id: 'loc-1',
    name: 'New York',
    employeeLocations: [],
    balances: [],
    requests: [],
  };

  const activeEL: EmployeeLocation = {
    id: 'el-1',
    employeeId: 'emp-1',
    locationId: 'loc-1',
    active: true,
    employee: null,
    location: null,
  };

  const inactiveEL: EmployeeLocation = {
    id: 'el-inactive',
    employeeId: 'emp-1',
    locationId: 'loc-inactive',
    active: false,
    employee: null,
    location: null,
  };

  const balance: TimeOffBalance = {
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

  function makeMockRequest(overrides = {}): TimeOffRequest {
    return {
      id: 'req-1',
      employeeId: 'emp-1',
      locationId: 'loc-1',
      requestedDays: 2,
      status: 'APPROVED',
      failureReason: null,
      hcmTransactionId: 'TX-1',
      idempotencyKey: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      employee: null,
      location: null,
      ...overrides,
    };
  }

  function setupTransactionMock(result: TimeOffRequest) {
    dataSource.transaction.mockImplementation(async (cb: Function) => {
      const manager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === TimeOffBalance) {
            return {
              findOne: jest.fn().mockResolvedValue(balance),
              save: jest.fn().mockResolvedValue(balance),
            };
          }
          if (entity === TimeOffRequest) {
            return {
              create: jest.fn().mockReturnValue(result),
              save: jest.fn().mockResolvedValue(result),
            };
          }
        }),
      };
      return cb(manager);
    });
  }

  beforeEach(async () => {
    const createMockRepo = () => ({
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    });

    requestRepo = createMockRepo();
    balanceRepo = createMockRepo();
    employeeRepo = createMockRepo();
    locationRepo = createMockRepo();
    employeeLocationRepo = createMockRepo();

    const mockHcmClient = {
      getBalance: jest.fn(),
      submitTimeOff: jest.fn(),
      getBatchBalances: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeOffService,
        { provide: getRepositoryToken(TimeOffRequest), useValue: requestRepo },
        { provide: getRepositoryToken(TimeOffBalance), useValue: balanceRepo },
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: getRepositoryToken(Location), useValue: locationRepo },
        { provide: getRepositoryToken(EmployeeLocation), useValue: employeeLocationRepo },
        { provide: HcmClientService, useValue: mockHcmClient },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<TimeOffService>(TimeOffService);
    hcmClient = module.get(HcmClientService);
  });

  describe('createRequest', () => {
    it('rejects requestedDays <= 0', async () => {
      await expect(
        service.createRequest({ employeeId: 'emp-1', locationId: 'loc-1', requestedDays: 0 }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createRequest({ employeeId: 'emp-1', locationId: 'loc-1', requestedDays: -1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when employee does not exist', async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createRequest({ employeeId: 'emp-nonexistent', locationId: 'loc-1', requestedDays: 2 }),
      ).rejects.toThrow(EmployeeNotFoundException);
    });

    it('rejects when employee is inactive', async () => {
      employeeRepo.findOne.mockResolvedValue(inactiveEmployee);

      await expect(
        service.createRequest({ employeeId: 'emp-inactive', locationId: 'loc-1', requestedDays: 2 }),
      ).rejects.toThrow(InactiveEmployeeException);
    });

    it('rejects when location does not exist', async () => {
      employeeRepo.findOne.mockResolvedValue(activeEmployee);
      locationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createRequest({ employeeId: 'emp-1', locationId: 'loc-nonexistent', requestedDays: 2 }),
      ).rejects.toThrow(LocationNotFoundException);
    });

    it('rejects when employee-location pairing is inactive', async () => {
      employeeRepo.findOne.mockResolvedValue(activeEmployee);
      locationRepo.findOne.mockResolvedValue(location);
      employeeLocationRepo.findOne.mockResolvedValue(inactiveEL);

      await expect(
        service.createRequest({ employeeId: 'emp-1', locationId: 'loc-inactive', requestedDays: 2 }),
      ).rejects.toThrow(InactiveEmployeeLocationException);
    });

    it('rejects when employee-location pairing does not exist', async () => {
      employeeRepo.findOne.mockResolvedValue(activeEmployee);
      locationRepo.findOne.mockResolvedValue(location);
      employeeLocationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createRequest({ employeeId: 'emp-1', locationId: 'loc-1', requestedDays: 2 }),
      ).rejects.toThrow(InactiveEmployeeLocationException);
    });

    it('rejects when local balance is insufficient', async () => {
      employeeRepo.findOne.mockResolvedValue(activeEmployee);
      locationRepo.findOne.mockResolvedValue(location);
      employeeLocationRepo.findOne.mockResolvedValue(activeEL);
      requestRepo.findOne.mockResolvedValue(null); // no idempotency match
      balanceRepo.findOne.mockResolvedValue({ ...balance, balanceDays: 5 });

      await expect(
        service.createRequest({ employeeId: 'emp-1', locationId: 'loc-1', requestedDays: 8 }),
      ).rejects.toThrow(InsufficientBalanceException);
    });

    it('creates FAILED request when HCM times out during balance check', async () => {
      employeeRepo.findOne.mockResolvedValue(activeEmployee);
      locationRepo.findOne.mockResolvedValue(location);
      employeeLocationRepo.findOne.mockResolvedValue(activeEL);
      requestRepo.findOne.mockResolvedValue(null);
      balanceRepo.findOne.mockResolvedValue(balance);
      hcmClient.getBalance.mockRejectedValue(new HcmTimeoutError('getBalance'));

      const failedRequest = makeMockRequest({ status: 'FAILED', failureReason: 'timeout' });
      requestRepo.create.mockReturnValue(failedRequest);
      requestRepo.save.mockResolvedValue(failedRequest);

      const result = await service.createRequest({
        employeeId: 'emp-1',
        locationId: 'loc-1',
        requestedDays: 2,
      });

      expect(result.status).toBe('FAILED');
      expect(requestRepo.save).toHaveBeenCalled();
    });

    it('rejects when HCM realtime balance is insufficient (after sync)', async () => {
      employeeRepo.findOne.mockResolvedValue(activeEmployee);
      locationRepo.findOne.mockResolvedValue(location);
      employeeLocationRepo.findOne.mockResolvedValue(activeEL);
      requestRepo.findOne.mockResolvedValue(null);
      // Local has 10, HCM reports 3
      balanceRepo.findOne.mockResolvedValue({ ...balance, balanceDays: 10 });
      hcmClient.getBalance.mockResolvedValue({ balanceDays: 3 });
      balanceRepo.save.mockResolvedValue({ ...balance, balanceDays: 3 });

      await expect(
        service.createRequest({ employeeId: 'emp-1', locationId: 'loc-1', requestedDays: 8 }),
      ).rejects.toThrow(InsufficientBalanceException);
    });

    it('updates local balance when HCM shows different balance', async () => {
      employeeRepo.findOne.mockResolvedValue(activeEmployee);
      locationRepo.findOne.mockResolvedValue(location);
      employeeLocationRepo.findOne.mockResolvedValue(activeEL);
      requestRepo.findOne.mockResolvedValue(null);
      // Local has 10, HCM has 15
      balanceRepo.findOne.mockResolvedValue({ ...balance, balanceDays: 10 });
      hcmClient.getBalance.mockResolvedValue({ balanceDays: 15 });
      balanceRepo.save.mockResolvedValue({ ...balance, balanceDays: 15 });
      hcmClient.submitTimeOff.mockResolvedValue({ transactionId: 'TX-1', success: true });

      const approvedRequest = makeMockRequest({ status: 'APPROVED' });
      setupTransactionMock(approvedRequest);

      const result = await service.createRequest({
        employeeId: 'emp-1',
        locationId: 'loc-1',
        requestedDays: 2,
      });

      // Balance was saved with updated value before transaction
      expect(balanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ balanceDays: 15, source: 'HCM_REALTIME' }),
      );
    });

    it('happy path: approves request and deducts balance', async () => {
      employeeRepo.findOne.mockResolvedValue(activeEmployee);
      locationRepo.findOne.mockResolvedValue(location);
      employeeLocationRepo.findOne.mockResolvedValue(activeEL);
      requestRepo.findOne.mockResolvedValue(null);
      balanceRepo.findOne.mockResolvedValue(balance);
      hcmClient.getBalance.mockResolvedValue({ balanceDays: 10 });
      hcmClient.submitTimeOff.mockResolvedValue({ transactionId: 'TX-42', success: true });

      const approvedRequest = makeMockRequest({ status: 'APPROVED', hcmTransactionId: 'TX-42' });
      setupTransactionMock(approvedRequest);

      const result = await service.createRequest({
        employeeId: 'emp-1',
        locationId: 'loc-1',
        requestedDays: 2,
      });

      expect(result.status).toBe('APPROVED');
      expect(result.hcmTransactionId).toBe('TX-42');
    });

    it('creates APPROVED_WITH_WARNING when HCM returns no transaction ID', async () => {
      employeeRepo.findOne.mockResolvedValue(activeEmployee);
      locationRepo.findOne.mockResolvedValue(location);
      employeeLocationRepo.findOne.mockResolvedValue(activeEL);
      requestRepo.findOne.mockResolvedValue(null);
      balanceRepo.findOne.mockResolvedValue(balance);
      hcmClient.getBalance.mockResolvedValue({ balanceDays: 10 });
      hcmClient.submitTimeOff.mockResolvedValue({ transactionId: null, success: true });

      const warningRequest = makeMockRequest({
        status: 'APPROVED_WITH_WARNING',
        hcmTransactionId: null,
      });
      setupTransactionMock(warningRequest);

      const result = await service.createRequest({
        employeeId: 'emp-1',
        locationId: 'loc-1',
        requestedDays: 2,
      });

      expect(result.status).toBe('APPROVED_WITH_WARNING');
    });

    it('creates FAILED when HCM times out during submit', async () => {
      employeeRepo.findOne.mockResolvedValue(activeEmployee);
      locationRepo.findOne.mockResolvedValue(location);
      employeeLocationRepo.findOne.mockResolvedValue(activeEL);
      requestRepo.findOne.mockResolvedValue(null);
      balanceRepo.findOne.mockResolvedValue(balance);
      hcmClient.getBalance.mockResolvedValue({ balanceDays: 10 });
      hcmClient.submitTimeOff.mockRejectedValue(new HcmTimeoutError('submitTimeOff'));

      const failedRequest = makeMockRequest({
        status: 'FAILED',
        failureReason: 'HCM timeout during submit',
      });

      dataSource.transaction.mockImplementation(async (cb: Function) => {
        const manager = {
          getRepository: jest.fn().mockImplementation((entity) => {
            if (entity === TimeOffBalance) {
              return {
                findOne: jest.fn().mockResolvedValue(balance),
                save: jest.fn().mockResolvedValue(balance),
              };
            }
            if (entity === TimeOffRequest) {
              return {
                create: jest.fn().mockReturnValue(failedRequest),
                save: jest.fn().mockResolvedValue(failedRequest),
              };
            }
          }),
        };
        return cb(manager);
      });

      const result = await service.createRequest({
        employeeId: 'emp-1',
        locationId: 'loc-1',
        requestedDays: 2,
      });

      expect(result.status).toBe('FAILED');
    });

    it('returns existing request for duplicate idempotency key', async () => {
      const existingRequest = makeMockRequest({
        idempotencyKey: 'idem-key-1',
        status: 'APPROVED',
      });
      employeeRepo.findOne.mockResolvedValue(activeEmployee);
      locationRepo.findOne.mockResolvedValue(location);
      employeeLocationRepo.findOne.mockResolvedValue(activeEL);
      requestRepo.findOne.mockResolvedValue(existingRequest);

      const result = await service.createRequest({
        employeeId: 'emp-1',
        locationId: 'loc-1',
        requestedDays: 2,
        idempotencyKey: 'idem-key-1',
      });

      expect(result).toEqual(existingRequest);
      // Should not call HCM
      expect(hcmClient.getBalance).not.toHaveBeenCalled();
      expect(hcmClient.submitTimeOff).not.toHaveBeenCalled();
    });

    it('concurrency simulation: mutex prevents double deduction', async () => {
      employeeRepo.findOne.mockResolvedValue(activeEmployee);
      locationRepo.findOne.mockResolvedValue(location);
      employeeLocationRepo.findOne.mockResolvedValue(activeEL);
      requestRepo.findOne.mockResolvedValue(null);

      // First call sees 10, second call sees 10 (concurrent reads before lock)
      let balanceValue = 10;
      balanceRepo.findOne.mockImplementation(async () => ({
        ...balance,
        balanceDays: balanceValue,
      }));

      hcmClient.getBalance.mockImplementation(async () => ({
        balanceDays: balanceValue,
      }));

      hcmClient.submitTimeOff.mockImplementation(async () => {
        balanceValue -= 7; // simulate deduction
        return { transactionId: 'TX-1', success: true };
      });

      const approvedRequest = makeMockRequest({ status: 'APPROVED' });
      const rejectedRequest = makeMockRequest({ status: 'REJECTED' });

      let callCount = 0;
      dataSource.transaction.mockImplementation(async (cb: Function) => {
        callCount++;
        const manager = {
          getRepository: jest.fn().mockImplementation((entity) => {
            if (entity === TimeOffBalance) {
              return {
                findOne: jest.fn().mockResolvedValue({ ...balance, balanceDays: balanceValue }),
                save: jest.fn().mockResolvedValue(balance),
              };
            }
            if (entity === TimeOffRequest) {
              return {
                create: jest.fn().mockReturnValue(callCount === 1 ? approvedRequest : rejectedRequest),
                save: jest.fn().mockResolvedValue(callCount === 1 ? approvedRequest : rejectedRequest),
              };
            }
          }),
        };
        return cb(manager);
      });

      const results = await Promise.allSettled([
        service.createRequest({ employeeId: 'emp-1', locationId: 'loc-1', requestedDays: 7 }),
        service.createRequest({ employeeId: 'emp-1', locationId: 'loc-1', requestedDays: 7 }),
      ]);

      // Mutex serializes the two calls. The first succeeds; the second sees
      // balanceValue=3 after the first deduction and is rejected with
      // InsufficientBalanceException — which is the correct behavior.
      const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
      expect(fulfilled[0].value.status).toBe('APPROVED');
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(InsufficientBalanceException);
    });

    it('supports decimal requestedDays', async () => {
      employeeRepo.findOne.mockResolvedValue(activeEmployee);
      locationRepo.findOne.mockResolvedValue(location);
      employeeLocationRepo.findOne.mockResolvedValue(activeEL);
      requestRepo.findOne.mockResolvedValue(null);
      balanceRepo.findOne.mockResolvedValue({ ...balance, balanceDays: 10 });
      hcmClient.getBalance.mockResolvedValue({ balanceDays: 10 });
      hcmClient.submitTimeOff.mockResolvedValue({ transactionId: 'TX-dec', success: true });

      const approvedRequest = makeMockRequest({ requestedDays: 1.5, status: 'APPROVED' });
      setupTransactionMock(approvedRequest);

      const result = await service.createRequest({
        employeeId: 'emp-1',
        locationId: 'loc-1',
        requestedDays: 1.5,
      });

      expect(result.status).toBe('APPROVED');
    });
  });
});
