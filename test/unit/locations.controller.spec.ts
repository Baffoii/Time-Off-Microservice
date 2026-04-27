import { Test, TestingModule } from '@nestjs/testing';
import { LocationsController } from '../../src/locations/locations.controller';
import { LocationsService } from '../../src/locations/locations.service';
import { Location } from '../../src/database/entities/location.entity';
import { LocationNotFoundException } from '../../src/common/exceptions';

const makeLocation = (o: Partial<Location> = {}): Location =>
  ({ id: 'loc-1', name: 'NYC', employeeLocations: [], balances: [], requests: [], ...o } as Location);

describe('LocationsController', () => {
  let controller: LocationsController;
  let service: jest.Mocked<LocationsService>;

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [{ provide: LocationsService, useValue: mockService }],
    }).compile();

    controller = module.get<LocationsController>(LocationsController);
    service = module.get(LocationsService);
  });

  describe('findAll', () => {
    it('returns all locations from service', async () => {
      service.findAll.mockResolvedValue([makeLocation()]);
      const result = await controller.findAll();
      expect(result).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('returns empty array when no locations exist', async () => {
      service.findAll.mockResolvedValue([]);
      const result = await controller.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns location by id', async () => {
      service.findById.mockResolvedValue(makeLocation());
      const result = await controller.findOne('loc-1');
      expect(result.id).toBe('loc-1');
      expect(service.findById).toHaveBeenCalledWith('loc-1');
    });

    it('propagates LocationNotFoundException from service', async () => {
      service.findById.mockRejectedValue(new LocationNotFoundException('missing'));
      await expect(controller.findOne('missing')).rejects.toThrow(LocationNotFoundException);
    });
  });
});
