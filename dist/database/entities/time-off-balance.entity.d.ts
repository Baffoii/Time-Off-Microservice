import { Employee } from './employee.entity';
import { Location } from './location.entity';
export type BalanceSource = 'HCM_BATCH' | 'HCM_REALTIME' | 'LOCAL_PENDING';
export declare class TimeOffBalance {
    id: string;
    employeeId: string;
    locationId: string;
    balanceDays: number;
    lastSyncedAt: Date | null;
    source: BalanceSource;
    missingFromLatestBatch: boolean;
    employee: Employee;
    location: Location;
    updatedAt: Date;
}
