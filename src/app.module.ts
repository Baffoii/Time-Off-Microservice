import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { EmployeesModule } from './employees/employees.module';
import { LocationsModule } from './locations/locations.module';
import { BalancesModule } from './balances/balances.module';
import { TimeOffModule } from './time-off/time-off.module';
import { SyncModule } from './sync/sync.module';
import { HcmClientModule } from './hcm-client/hcm-client.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    HcmClientModule,
    EmployeesModule,
    LocationsModule,
    BalancesModule,
    TimeOffModule,
    SyncModule,
  ],
})
export class AppModule {}
