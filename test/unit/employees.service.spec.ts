import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmployeesService } from '../../src/employees/employees.service';
import { Employee } from '../../src/database/entities/employee.entity';
import { Location } from '../../src/database/entities/location.entity';
import { EmployeeLocation } from '../../src/database/entities/employee-location.entity';
import {
  EmployeeNotFoundException,
  LocationNotFoundException,
  InactiveEmployeeException,
  InactiveEmployeeLocationException,
} from '../../src/common/exceptions';

const makeEmployee = (o: Partial<Employee> = {}): Employee =>
  ({ id: 'emp-1', name: 'Alice', status: 'ACTIVE', employeeLocations: [], balances: [], requests: [], ...o } as Employee);

const makeLocation = (o: Partial<Location> = {}): Location =>
  ({ id: 'loc-1', name: 'NYC', employeeLocations: [], balances: [], requests: [], ...o } as Location);

const makeEL = (o: Partial<EmployeeLocation> = {}): EmployeeLocation =>
  ({ id: 'el-1', employeeId: 'emp-1', locationId: 'loc-1', active: true, ...o } as EmployeeLocation);

describe('EmployeesService', () => {
  let service: EmployeesService;
  let employeeRepo: any;
  let locationRepo: any;
  let elRepo: any;

  beforeEach(async () => {
    employeeRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    locationRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    elRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: getRepositoryToken(Location), useValue: locationRepo },
        { provide: getRepositoryToken(EmployeeLocation), useValue: elRepo },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  describe('findAll', () => {
    it('returns all employees', async () => {
      employeeRepo.find.mockResolvedValue([makeEmployee()]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(employeeRepo.find).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns employee when found', async () => {
      employeeRepo.findOne.mockResolvedValue(makeEmployee());
      const result = await service.findById('emp-1');
      expect(result.id).toBe('emp-1');
    });

    it('throws EmployeeNotFoundException when not found', async () => {
      employeeRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(EmployeeNotFoundException);
    });
  });

  describe('validateActiveEmployee', () => {
    it('returns employee when ACTIVE', async () => {
      employeeRepo.findOne.mockResolvedValue(makeEmployee({ status: 'ACTIVE' }));
      const result = await service.validateActiveEmployee('emp-1');
      expect(result.status).toBe('ACTIVE');
    });

    it('throws EmployeeNotFoundException when not found', async () => {
      employeeRepo.findOne.mockResolvedValue(null);
      await expect(service.validateActiveEmployee('missing')).rejects.toThrow(EmployeeNotFoundException);
    });

    it('throws InactiveEmployeeException when INACTIVE', async () => {
      employeeRepo.findOne.mockResolvedValue(makeEmployee({ status: 'INACTIVE' }));
      await expect(service.validateActiveEmployee('emp-1')).rejects.toThrow(InactiveEmployeeException);
    });
  });

  describe('validateLocation', () => {
    it('returns location when found', async () => {
      locationRepo.findOne.mockResolvedValue(makeLocation());
      const result = await service.validateLocation('loc-1');
      expect(result.id).toBe('loc-1');
    });

    it('throws LocationNotFoundException when not found', async () => {
      locationRepo.findOne.mockResolvedValue(null);
      await expect(service.validateLocation('missing')).rejects.toThrow(LocationNotFoundException);
    });
  });

  describe('validateActiveEmployeeLocation', () => {
    it('returns pairing when active', async () => {
      elRepo.findOne.mockResolvedValue(makeEL({ active: true }));
      const result = await service.validateActiveEmployeeLocation('emp-1', 'loc-1');
      expect(result.active).toBe(true);
    });

    it('throws InactiveEmployeeLocationException when pairing not found', async () => {
      elRepo.findOne.mockResolvedValue(null);
      await expect(service.validateActiveEmployeeLocation('emp-1', 'loc-1')).rejects.toThrow(
        InactiveEmployeeLocationException,
      );
    });

    it('throws InactiveEmployeeLocationException when pairing is inactive', async () => {
      elRepo.findOne.mockResolvedValue(makeEL({ active: false }));
      await expect(service.validateActiveEmployeeLocation('emp-1', 'loc-1')).rejects.toThrow(
        InactiveEmployeeLocationException,
      );
    });
  });

  describe('create', () => {
    it('creates and saves an employee with default ACTIVE status', async () => {
      const emp = makeEmployee();
      employeeRepo.create.mockReturnValue(emp);
      employeeRepo.save.mockResolvedValue(emp);
      const result = await service.create('Alice');
      expect(employeeRepo.create).toHaveBeenCalledWith({ name: 'Alice', status: 'ACTIVE' });
      expect(result.name).toBe('Alice');
    });

    it('creates an INACTIVE employee when specified', async () => {
      const emp = makeEmployee({ status: 'INACTIVE' });
      employeeRepo.create.mockReturnValue(emp);
      employeeRepo.save.mockResolvedValue(emp);
      const result = await service.create('Charlie', 'INACTIVE');
      expect(employeeRepo.create).toHaveBeenCalledWith({ name: 'Charlie', status: 'INACTIVE' });
      expect(result.status).toBe('INACTIVE');
    });
  });

  describe('createLocation', () => {
    it('creates and saves a location', async () => {
      const loc = makeLocation();
      locationRepo.create.mockReturnValue(loc);
      locationRepo.save.mockResolvedValue(loc);
      const result = await service.createLocation('NYC');
      expect(locationRepo.create).toHaveBeenCalledWith({ name: 'NYC' });
      expect(result.name).toBe('NYC');
    });
  });

  describe('createEmployeeLocation', () => {
    it('creates an active employee-location pairing by default', async () => {
      const el = makeEL();
      elRepo.create.mockReturnValue(el);
      elRepo.save.mockResolvedValue(el);
      const result = await service.createEmployeeLocation('emp-1', 'loc-1');
      expect(elRepo.create).toHaveBeenCalledWith({ employeeId: 'emp-1', locationId: 'loc-1', active: true });
      expect(result.active).toBe(true);
    });

    it('creates an inactive employee-location pairing when specified', async () => {
      const el = makeEL({ active: false });
      elRepo.create.mockReturnValue(el);
      elRepo.save.mockResolvedValue(el);
      const result = await service.createEmployeeLocation('emp-1', 'loc-1', false);
      expect(result.active).toBe(false);
    });
  });
});
