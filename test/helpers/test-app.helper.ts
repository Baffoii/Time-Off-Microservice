import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter';
import { Employee } from '../../src/database/entities/employee.entity';
import { Location } from '../../src/database/entities/location.entity';
import { EmployeeLocation } from '../../src/database/entities/employee-location.entity';
import { TimeOffBalance } from '../../src/database/entities/time-off-balance.entity';
import { TimeOffRequest } from '../../src/database/entities/time-off-request.entity';
import { EmployeesModule } from '../../src/employees/employees.module';
import { LocationsModule } from '../../src/locations/locations.module';
import { BalancesModule } from '../../src/balances/balances.module';
import { TimeOffModule } from '../../src/time-off/time-off.module';
import { SyncModule } from '../../src/sync/sync.module';
import { MockHcmStore } from '../../src/mock-hcm/mock-hcm-store';
import { HcmClientService } from '../../src/hcm-client/hcm-client.service';
import {
  HcmTimeoutError,
  HcmNotFoundError,
  HcmServerError,
} from '../../src/common/exceptions';

/**
 * MockHcmClientService that uses MockHcmStore directly (no HTTP calls)
 * Properly throws typed errors that the business logic understands
 */
export class MockHcmClientService {
  constructor(private readonly store: MockHcmStore) {}

  async getBalance(employeeId: string, locationId: string) {
    const mode = this.store.getMode();
    if (mode === 'timeout') {
      await new Promise((_, reject) =>
        setTimeout(
          () => reject(new HcmTimeoutError(`getBalance(${employeeId}, ${locationId})`)),
          500,
        ),
      );
    }
    if (mode === 'serverError') {
      throw new HcmServerError(500, 'Mock HCM server error');
    }
    const balance = this.store.getBalance(employeeId, locationId);
    if (balance === undefined) {
      throw new HcmNotFoundError(`${employeeId}/${locationId}`);
    }
    return { balanceDays: balance };
  }

  async submitTimeOff(employeeId: string, locationId: string, days: number) {
    const mode = this.store.getMode();
    if (mode === 'timeout') {
      await new Promise((_, reject) =>
        setTimeout(
          () => reject(new HcmTimeoutError(`submitTimeOff(${employeeId}, ${locationId})`)),
          500,
        ),
      );
    }
    if (mode === 'serverError') {
      throw new HcmServerError(500, 'Mock HCM server error');
    }
    const result = this.store.deductBalance(employeeId, locationId, days);
    return result;
  }

  async getBatchBalances() {
    const mode = this.store.getMode();
    if (mode === 'serverError') {
      throw new HcmServerError(500, 'Mock HCM server error');
    }
    return this.store.getAllBalances();
  }
}

export interface TestContext {
  app: INestApplication;
  dataSource: DataSource;
  store: MockHcmStore;
}

export async function createTestApp(): Promise<TestContext> {
  const store = new MockHcmStore();
  const mockHcmClient = new MockHcmClientService(store);

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        entities: [Employee, Location, EmployeeLocation, TimeOffBalance, TimeOffRequest],
        synchronize: true,
        logging: false,
      }),
      EmployeesModule,
      LocationsModule,
      BalancesModule,
      TimeOffModule,
      SyncModule,
    ],
  })
    .overrideProvider(HcmClientService)
    .useValue(mockHcmClient)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();

  const dataSource = moduleFixture.get<DataSource>(getDataSourceToken());

  return { app, dataSource, store };
}

export async function seedTestData(
  dataSource: DataSource,
  store: MockHcmStore,
) {
  const employeeRepo = dataSource.getRepository(Employee);
  const locationRepo = dataSource.getRepository(Location);
  const elRepo = dataSource.getRepository(EmployeeLocation);
  const balanceRepo = dataSource.getRepository(TimeOffBalance);

  const alice = await employeeRepo.save(
    employeeRepo.create({ name: 'Alice', status: 'ACTIVE' }),
  );
  const bob = await employeeRepo.save(
    employeeRepo.create({ name: 'Bob', status: 'ACTIVE' }),
  );
  const charlie = await employeeRepo.save(
    employeeRepo.create({ name: 'Charlie', status: 'INACTIVE' }),
  );

  const nyc = await locationRepo.save(locationRepo.create({ name: 'New York' }));
  const sf = await locationRepo.save(locationRepo.create({ name: 'San Francisco' }));

  await elRepo.save(
    elRepo.create({ employeeId: alice.id, locationId: nyc.id, active: true }),
  );
  await elRepo.save(
    elRepo.create({ employeeId: alice.id, locationId: sf.id, active: true }),
  );
  await elRepo.save(
    elRepo.create({ employeeId: bob.id, locationId: nyc.id, active: true }),
  );
  await elRepo.save(
    elRepo.create({ employeeId: bob.id, locationId: sf.id, active: false }),
  );
  await elRepo.save(
    elRepo.create({ employeeId: charlie.id, locationId: nyc.id, active: true }),
  );

  await balanceRepo.save(
    balanceRepo.create({
      employeeId: alice.id,
      locationId: nyc.id,
      balanceDays: 10,
      source: 'HCM_BATCH',
      lastSyncedAt: new Date(),
    }),
  );
  await balanceRepo.save(
    balanceRepo.create({
      employeeId: bob.id,
      locationId: nyc.id,
      balanceDays: 5,
      source: 'HCM_BATCH',
      lastSyncedAt: new Date(),
    }),
  );

  // Keep HCM store in sync with local balances
  store.setBalance(alice.id, nyc.id, 10);
  store.setBalance(bob.id, nyc.id, 5);

  return { alice, bob, charlie, nyc, sf };
}
