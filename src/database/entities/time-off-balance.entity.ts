import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from './employee.entity';
import { Location } from './location.entity';

export type BalanceSource = 'HCM_BATCH' | 'HCM_REALTIME' | 'LOCAL_PENDING';

@Entity()
@Unique(['employeeId', 'locationId'])
export class TimeOffBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  employeeId: string;

  @Column()
  locationId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  balanceDays: number;

  @Column({ type: 'datetime', nullable: true })
  lastSyncedAt: Date | null;

  @Column({ type: 'varchar' })
  source: BalanceSource;

  @Column({ default: false })
  missingFromLatestBatch: boolean;

  @ManyToOne(() => Employee, (e) => e.balances)
  employee: Employee;

  @ManyToOne(() => Location, (l) => l.balances)
  location: Location;

  @UpdateDateColumn()
  updatedAt: Date;
}
