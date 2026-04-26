import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeOffRequest } from '../database/entities/time-off-request.entity';
import { TimeOffBalance } from '../database/entities/time-off-balance.entity';
import { Employee } from '../database/entities/employee.entity';
import { Location } from '../database/entities/location.entity';
import { EmployeeLocation } from '../database/entities/employee-location.entity';
import { TimeOffService } from './time-off.service';
import { TimeOffController } from './time-off.controller';
import { HcmClientModule } from '../hcm-client/hcm-client.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TimeOffRequest,
      TimeOffBalance,
      Employee,
      Location,
      EmployeeLocation,
    ]),
    HcmClientModule,
  ],
  providers: [TimeOffService],
  controllers: [TimeOffController],
  exports: [TimeOffService],
})
export class TimeOffModule {}
