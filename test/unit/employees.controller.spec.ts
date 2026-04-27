import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesController } from '../../src/employees/employees.controller';
import { EmployeesService } from '../../src/employees/employees.service';
import { Employee } from '../../src/database/entities/employee.entity';
import { EmployeeNotFoundException } from '../../src/common/exceptions';

const makeEmployee = (o: Partial<Employee> = {}): Employee =>
  ({ id: 'emp-1', name: 'Alice', status: 'ACTIVE', employeeLocations: [], balances: [], requests: [], ...o } as Employee);

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let service: jest.Mocked<EmployeesService>;

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [{ provide: EmployeesService, useValue: mockService }],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
    service = module.get(EmployeesService);
  });

  describe('findAll', () => {
    it('returns all employees from service', async () => {
      service.findAll.mockResolvedValue([makeEmployee()]);
      const result = await controller.findAll();
      expect(result).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('returns empty array when no employees exist', async () => {
      service.findAll.mockResolvedValue([]);
      const result = await controller.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns employee by id', async () => {
      service.findById.mockResolvedValue(makeEmployee());
      const result = await controller.findOne('emp-1');
      expect(result.id).toBe('emp-1');
      expect(service.findById).toHaveBeenCalledWith('emp-1');
    });

    it('propagates EmployeeNotFoundException from service', async () => {
      service.findById.mockRejectedValue(new EmployeeNotFoundException('missing'));
      await expect(controller.findOne('missing')).rejects.toThrow(EmployeeNotFoundException);
    });
  });
});
