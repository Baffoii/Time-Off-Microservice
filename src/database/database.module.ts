import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  Employee,
  Location,
  EmployeeLocation,
  TimeOffBalance,
  TimeOffRequest,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3',
        database: config.get<string>('DATABASE_PATH', ':memory:'),
        entities: [Employee, Location, EmployeeLocation, TimeOffBalance, TimeOffRequest],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
