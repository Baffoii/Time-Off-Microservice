import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../database/entities/employee.entity';
import { EmployeeLocation } from '../database/entities/employee-location.entity';
import { Location } from '../database/entities/location.entity';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, EmployeeLocation, Location])],
  providers: [EmployeesService],
  controllers: [EmployeesController],
  exports: [EmployeesService],
})
export class EmployeesModule {}
