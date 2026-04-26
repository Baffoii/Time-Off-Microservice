import { EmployeeLocation } from './employee-location.entity';
import { TimeOffBalance } from './time-off-balance.entity';
import { TimeOffRequest } from './time-off-request.entity';
export declare class Location {
    id: string;
    name: string;
    employeeLocations: EmployeeLocation[];
    balances: TimeOffBalance[];
    requests: TimeOffRequest[];
}
