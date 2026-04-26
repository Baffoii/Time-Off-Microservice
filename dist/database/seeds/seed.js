"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const employee_entity_1 = require("../entities/employee.entity");
const location_entity_1 = require("../entities/location.entity");
const employee_location_entity_1 = require("../entities/employee-location.entity");
const time_off_balance_entity_1 = require("../entities/time-off-balance.entity");
const dotenv = require("dotenv");
dotenv.config();
const AppDataSource = new typeorm_1.DataSource({
    type: 'better-sqlite3',
    database: process.env.DATABASE_PATH || './data/timeoff.db',
    entities: [employee_entity_1.Employee, location_entity_1.Location, employee_location_entity_1.EmployeeLocation, time_off_balance_entity_1.TimeOffBalance],
    synchronize: true,
});
async function seed() {
    await AppDataSource.initialize();
    console.log('Database connected. Seeding...');
    const employeeRepo = AppDataSource.getRepository(employee_entity_1.Employee);
    const locationRepo = AppDataSource.getRepository(location_entity_1.Location);
    const elRepo = AppDataSource.getRepository(employee_location_entity_1.EmployeeLocation);
    const balanceRepo = AppDataSource.getRepository(time_off_balance_entity_1.TimeOffBalance);
    await balanceRepo.delete({});
    await elRepo.delete({});
    await employeeRepo.delete({});
    await locationRepo.delete({});
    const alice = await employeeRepo.save(employeeRepo.create({ name: 'Alice Johnson', status: 'ACTIVE' }));
    const bob = await employeeRepo.save(employeeRepo.create({ name: 'Bob Smith', status: 'ACTIVE' }));
    const charlie = await employeeRepo.save(employeeRepo.create({ name: 'Charlie Brown', status: 'INACTIVE' }));
    console.log(`Created employees: ${alice.name}, ${bob.name}, ${charlie.name}`);
    const nyc = await locationRepo.save(locationRepo.create({ name: 'New York' }));
    const sf = await locationRepo.save(locationRepo.create({ name: 'San Francisco' }));
    console.log(`Created locations: ${nyc.name}, ${sf.name}`);
    await elRepo.save(elRepo.create({ employeeId: alice.id, locationId: nyc.id, active: true }));
    await elRepo.save(elRepo.create({ employeeId: alice.id, locationId: sf.id, active: true }));
    await elRepo.save(elRepo.create({ employeeId: bob.id, locationId: nyc.id, active: true }));
    await elRepo.save(elRepo.create({ employeeId: bob.id, locationId: sf.id, active: false }));
    await elRepo.save(elRepo.create({ employeeId: charlie.id, locationId: nyc.id, active: true }));
    console.log('Created employee-location pairings');
    await balanceRepo.save(balanceRepo.create({
        employeeId: alice.id,
        locationId: nyc.id,
        balanceDays: 15,
        source: 'HCM_BATCH',
        lastSyncedAt: new Date(),
    }));
    await balanceRepo.save(balanceRepo.create({
        employeeId: alice.id,
        locationId: sf.id,
        balanceDays: 10,
        source: 'HCM_BATCH',
        lastSyncedAt: new Date(),
    }));
    await balanceRepo.save(balanceRepo.create({
        employeeId: bob.id,
        locationId: nyc.id,
        balanceDays: 8,
        source: 'HCM_BATCH',
        lastSyncedAt: new Date(),
    }));
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
//# sourceMappingURL=seed.js.map