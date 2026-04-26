import { Employee } from './employee.entity';
import { Location } from './location.entity';
export declare class EmployeeLocation {
    id: string;
    employeeId: string;
    locationId: string;
    active: boolean;
    employee: Employee;
    location: Location;
}
