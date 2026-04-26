import { EmployeeLocation } from './employee-location.entity';
import { TimeOffBalance } from './time-off-balance.entity';
import { TimeOffRequest } from './time-off-request.entity';
export declare class Employee {
    id: string;
    name: string;
    status: 'ACTIVE' | 'INACTIVE';
    employeeLocations: EmployeeLocation[];
    balances: TimeOffBalance[];
    requests: TimeOffRequest[];
}
