import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TimeOffController } from '../../src/time-off/time-off.controller';
import { TimeOffService } from '../../src/time-off/time-off.service';
import { TimeOffRequest } from '../../src/database/entities/time-off-request.entity';

const makeRequest = (o: Partial<TimeOffRequest> = {}): TimeOffRequest =>
  ({
    id: 'req-1',
    employeeId: 'emp-1',
    locationId: 'loc-1',
    requestedDays: 2,
    status: 'APPROVED',
    hcmTransactionId: 'TX-1',
    failureReason: null,
    idempotencyKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...o,
  } as TimeOffRequest);

describe('TimeOffController', () => {
  let controller: TimeOffController;
  let service: jest.Mocked<TimeOffService>;

  beforeEach(async () => {
    const mockService = {
      createRequest: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimeOffController],
      providers: [{ provide: TimeOffService, useValue: mockService }],
    }).compile();

    controller = module.get<TimeOffController>(TimeOffController);
    service = module.get(TimeOffService);
  });

  describe('create', () => {
    it('delegates to service and returns the created request', async () => {
      const req = makeRequest();
      service.createRequest.mockResolvedValue(req);

      const result = await controller.create({
        employeeId: 'emp-1',
        locationId: 'loc-1',
        requestedDays: 2,
      });

      expect(result).toEqual(req);
      expect(service.createRequest).toHaveBeenCalledWith({
        employeeId: 'emp-1',
        locationId: 'loc-1',
        requestedDays: 2,
      });
    });
  });

  describe('findOne', () => {
    it('returns request when found', async () => {
      service.findById.mockResolvedValue(makeRequest());
      const result = await controller.findOne('req-1');
      expect(result.id).toBe('req-1');
      expect(service.findById).toHaveBeenCalledWith('req-1');
    });

    it('throws NotFoundException when service returns null', async () => {
      service.findById.mockResolvedValue(null);
      await expect(controller.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns filtered list from service', async () => {
      service.findAll.mockResolvedValue([makeRequest()]);
      const result = await controller.findAll({ employeeId: 'emp-1' });
      expect(result).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalledWith({ employeeId: 'emp-1' });
    });

    it('returns empty array when no requests match', async () => {
      service.findAll.mockResolvedValue([]);
      const result = await controller.findAll({});
      expect(result).toEqual([]);
    });
  });
});
