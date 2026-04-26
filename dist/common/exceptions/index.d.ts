import { HttpException } from '@nestjs/common';
export declare class EmployeeNotFoundException extends HttpException {
    constructor(employeeId: string);
}
export declare class LocationNotFoundException extends HttpException {
    constructor(locationId: string);
}
export declare class InactiveEmployeeException extends HttpException {
    constructor(employeeId: string);
}
export declare class InactiveEmployeeLocationException extends HttpException {
    constructor(employeeId: string, locationId: string);
}
export declare class InsufficientBalanceException extends HttpException {
    constructor(available: number, requested: number);
}
export declare class HcmTimeoutError extends Error {
    constructor(operation: string);
}
export declare class HcmServerError extends Error {
    constructor(status: number, message: string);
}
export declare class HcmNotFoundError extends Error {
    constructor(resource: string);
}
