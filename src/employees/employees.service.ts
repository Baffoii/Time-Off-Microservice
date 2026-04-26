import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../database/entities/employee.entity';
import { EmployeeLocation } from '../database/entities/employee-location.entity';
import {
  EmployeeNotFoundException,
  InactiveEmployeeException,
  InactiveEmployeeLocationException,
  LocationNotFoundException,
} from '../common/exceptions';
import { Location } from '../database/entities/location.entity';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(EmployeeLocation)
    private readonly employeeLocationRepo: Repository<EmployeeLocation>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
  ) {}

  async findAll(): Promise<Employee[]> {
    return this.employeeRepo.find();
  }

  async findById(id: string): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({ where: { id } });
    if (!employee) {
      throw new EmployeeNotFoundException(id);
    }
    return employee;
  }

  async validateActiveEmployee(employeeId: string): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new EmployeeNotFoundException(employeeId);
    }
    if (employee.status !== 'ACTIVE') {
      throw new InactiveEmployeeException(employeeId);
    }
    return employee;
  }

  async validateLocation(locationId: string): Promise<Location> {
    const location = await this.locationRepo.findOne({
      where: { id: locationId },
    });
    if (!location) {
      throw new LocationNotFoundException(locationId);
    }
    return location;
  }

  async validateActiveEmployeeLocation(
    employeeId: string,
    locationId: string,
  ): Promise<EmployeeLocation> {
    const el = await this.employeeLocationRepo.findOne({
      where: { employeeId, locationId },
    });
    if (!el || !el.active) {
      throw new InactiveEmployeeLocationException(employeeId, locationId);
    }
    return el;
  }

  async create(name: string, status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE'): Promise<Employee> {
    const employee = this.employeeRepo.create({ name, status });
    return this.employeeRepo.save(employee);
  }

  async createLocation(name: string): Promise<Location> {
    const location = this.locationRepo.create({ name });
    return this.locationRepo.save(location);
  }

  async createEmployeeLocation(
    employeeId: string,
    locationId: string,
    active = true,
  ): Promise<EmployeeLocation> {
    const el = this.employeeLocationRepo.create({
      employeeId,
      locationId,
      active,
    });
    return this.employeeLocationRepo.save(el);
  }
}
