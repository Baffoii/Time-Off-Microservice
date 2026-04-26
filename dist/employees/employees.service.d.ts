import { Repository } from 'typeorm';
import { Employee } from '../database/entities/employee.entity';
import { EmployeeLocation } from '../database/entities/employee-location.entity';
import { Location } from '../database/entities/location.entity';
export declare class EmployeesService {
    private readonly employeeRepo;
    private readonly employeeLocationRepo;
    private readonly locationRepo;
    constructor(employeeRepo: Repository<Employee>, employeeLocationRepo: Repository<EmployeeLocation>, locationRepo: Repository<Location>);
    findAll(): Promise<Employee[]>;
    findById(id: string): Promise<Employee>;
    validateActiveEmployee(employeeId: string): Promise<Employee>;
    validateLocation(locationId: string): Promise<Location>;
    validateActiveEmployeeLocation(employeeId: string, locationId: string): Promise<EmployeeLocation>;
    create(name: string, status?: 'ACTIVE' | 'INACTIVE'): Promise<Employee>;
    createLocation(name: string): Promise<Location>;
    createEmployeeLocation(employeeId: string, locationId: string, active?: boolean): Promise<EmployeeLocation>;
}
