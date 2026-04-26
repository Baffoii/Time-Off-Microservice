import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { Location } from '../entities/location.entity';
import { EmployeeLocation } from '../entities/employee-location.entity';
import { TimeOffBalance } from '../entities/time-off-balance.entity';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: process.env.DATABASE_PATH || './data/timeoff.db',
  entities: [Employee, Location, EmployeeLocation, TimeOffBalance],
  synchronize: true,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('Database connected. Seeding...');

  const employeeRepo = AppDataSource.getRepository(Employee);
  const locationRepo = AppDataSource.getRepository(Location);
  const elRepo = AppDataSource.getRepository(EmployeeLocation);
  const balanceRepo = AppDataSource.getRepository(TimeOffBalance);

  // Clear existing data
  await balanceRepo.delete({});
  await elRepo.delete({});
  await employeeRepo.delete({});
  await locationRepo.delete({});

  // Create employees
  const alice = await employeeRepo.save(
    employeeRepo.create({ name: 'Alice Johnson', status: 'ACTIVE' }),
  );
  const bob = await employeeRepo.save(
    employeeRepo.create({ name: 'Bob Smith', status: 'ACTIVE' }),
  );
  const charlie = await employeeRepo.save(
    employeeRepo.create({ name: 'Charlie Brown', status: 'INACTIVE' }),
  );

  console.log(`Created employees: ${alice.name}, ${bob.name}, ${charlie.name}`);

  // Create locations
  const nyc = await locationRepo.save(
    locationRepo.create({ name: 'New York' }),
  );
  const sf = await locationRepo.save(
    locationRepo.create({ name: 'San Francisco' }),
  );

  console.log(`Created locations: ${nyc.name}, ${sf.name}`);

  // Create employee-location pairings
  await elRepo.save(elRepo.create({ employeeId: alice.id, locationId: nyc.id, active: true }));
  await elRepo.save(elRepo.create({ employeeId: alice.id, locationId: sf.id, active: true }));
  await elRepo.save(elRepo.create({ employeeId: bob.id, locationId: nyc.id, active: true }));
  // Inactive pairing
  await elRepo.save(elRepo.create({ employeeId: bob.id, locationId: sf.id, active: false }));
  await elRepo.save(elRepo.create({ employeeId: charlie.id, locationId: nyc.id, active: true }));

  console.log('Created employee-location pairings');

  // Create initial balances
  await balanceRepo.save(
    balanceRepo.create({
      employeeId: alice.id,
      locationId: nyc.id,
      balanceDays: 15,
      source: 'HCM_BATCH',
      lastSyncedAt: new Date(),
    }),
  );
  await balanceRepo.save(
    balanceRepo.create({
      employeeId: alice.id,
      locationId: sf.id,
      balanceDays: 10,
      source: 'HCM_BATCH',
      lastSyncedAt: new Date(),
    }),
  );
  await balanceRepo.save(
    balanceRepo.create({
      employeeId: bob.id,
      locationId: nyc.id,
      balanceDays: 8,
      source: 'HCM_BATCH',
      lastSyncedAt: new Date(),
    }),
  );

  console.log('Created initial balances');
  console.log('Seed complete!');
  console.log(`  Alice (${alice.id}): NYC=${nyc.id}, SF=${sf.id}`);
  console.log(`  Bob   (${bob.id}): NYC=${nyc.id}`);
  console.log(`  Charlie (${charlie.id}): NYC=${nyc.id} (inactive employee)`);

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
