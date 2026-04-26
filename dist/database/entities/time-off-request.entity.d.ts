import { Employee } from './employee.entity';
import { Location } from './location.entity';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED' | 'APPROVED_WITH_WARNING';
export declare class TimeOffRequest {
    id: string;
    employeeId: string;
    locationId: string;
    requestedDays: number;
    status: RequestStatus;
    failureReason: string | null;
    hcmTransactionId: string | null;
    idempotencyKey: string | null;
    createdAt: Date;
    updatedAt: Date;
    employee: Employee;
    location: Location;
}
