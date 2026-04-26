import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from './employee.entity';
import { Location } from './location.entity';

export type RequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'FAILED'
  | 'APPROVED_WITH_WARNING';

@Entity()
export class TimeOffRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  employeeId: string;

  @Column()
  locationId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  requestedDays: number;

  @Column({ type: 'varchar' })
  status: RequestStatus;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ type: 'varchar', nullable: true })
  hcmTransactionId: string | null;

  @Column({ type: 'varchar', nullable: true })
  idempotencyKey: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Employee, (e) => e.requests)
  employee: Employee;

  @ManyToOne(() => Location, (l) => l.requests)
  location: Location;
}
