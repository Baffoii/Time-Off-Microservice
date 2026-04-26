import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { EmployeeLocation } from './employee-location.entity';
import { TimeOffBalance } from './time-off-balance.entity';
import { TimeOffRequest } from './time-off-request.entity';

@Entity()
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE';

  @OneToMany(() => EmployeeLocation, (el) => el.employee)
  employeeLocations: EmployeeLocation[];

  @OneToMany(() => TimeOffBalance, (b) => b.employee)
  balances: TimeOffBalance[];

  @OneToMany(() => TimeOffRequest, (r) => r.employee)
  requests: TimeOffRequest[];
}
