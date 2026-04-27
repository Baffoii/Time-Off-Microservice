import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LocationsService } from '../../src/locations/locations.service';
import { Location } from '../../src/database/entities/location.entity';
import { LocationNotFoundException } from '../../src/common/exceptions';

const makeLocation = (o: Partial<Location> = {}): Location =>
  ({ id: 'loc-1', name: 'NYC', employeeLocations: [], balances: [], requests: [], ...o } as Location);

describe('LocationsService', () => {
  let service: LocationsService;
  let locationRepo: any;

  beforeEach(async () => {
    locationRepo = { find: jest.fn(), findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: getRepositoryToken(Location), useValue: locationRepo },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
  });

  describe('findAll', () => {
    it('returns all locations', async () => {
      locationRepo.find.mockResolvedValue([makeLocation(), makeLocation({ id: 'loc-2', name: 'SF' })]);
      const result = await service.findAll();
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no locations exist', async () => {
      locationRepo.find.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('returns location when found', async () => {
      locationRepo.findOne.mockResolvedValue(makeLocation());
      const result = await service.findById('loc-1');
      expect(result.id).toBe('loc-1');
      expect(result.name).toBe('NYC');
    });

    it('throws LocationNotFoundException when not found', async () => {
      locationRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(LocationNotFoundException);
    });
  });
});
