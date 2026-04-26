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
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @OneToMany(() => EmployeeLocation, (el) => el.location)
  employeeLocations: EmployeeLocation[];

  @OneToMany(() => TimeOffBalance, (b) => b.location)
  balances: TimeOffBalance[];

  @OneToMany(() => TimeOffRequest, (r) => r.location)
  requests: TimeOffRequest[];
}
