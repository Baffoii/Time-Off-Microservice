import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
} from 'typeorm';
import { Employee } from './employee.entity';
import { Location } from './location.entity';

@Entity()
@Unique(['employeeId', 'locationId'])
export class EmployeeLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  employeeId: string;

  @Column()
  locationId: string;

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => Employee, (e) => e.employeeLocations)
  employee: Employee;

  @ManyToOne(() => Location, (l) => l.employeeLocations)
  location: Location;
}
