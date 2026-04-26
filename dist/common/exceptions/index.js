"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HcmNotFoundError = exports.HcmServerError = exports.HcmTimeoutError = exports.InsufficientBalanceException = exports.InactiveEmployeeLocationException = exports.InactiveEmployeeException = exports.LocationNotFoundException = exports.EmployeeNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class EmployeeNotFoundException extends common_1.HttpException {
    constructor(employeeId) {
        super(`Employee with id ${employeeId} not found`, common_1.HttpStatus.NOT_FOUND);
    }
}
exports.EmployeeNotFoundException = EmployeeNotFoundException;
class LocationNotFoundException extends common_1.HttpException {
    constructor(locationId) {
        super(`Location with id ${locationId} not found`, common_1.HttpStatus.NOT_FOUND);
    }
}
exports.LocationNotFoundException = LocationNotFoundException;
class InactiveEmployeeException extends common_1.HttpException {
    constructor(employeeId) {
        super(`Employee with id ${employeeId} is inactive`, common_1.HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
exports.InactiveEmployeeException = InactiveEmployeeException;
class InactiveEmployeeLocationException extends common_1.HttpException {
    constructor(employeeId, locationId) {
        super(`Employee-Location pairing for employee ${employeeId} and location ${locationId} is inactive`, common_1.HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
exports.InactiveEmployeeLocationException = InactiveEmployeeLocationException;
class InsufficientBalanceException extends common_1.HttpException {
    constructor(available, requested) {
        super(`Insufficient balance: available ${available} days, requested ${requested} days`, common_1.HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
exports.InsufficientBalanceException = InsufficientBalanceException;
class HcmTimeoutError extends Error {
    constructor(operation) {
        super(`HCM request timed out during: ${operation}`);
        this.name = 'HcmTimeoutError';
    }
}
exports.HcmTimeoutError = HcmTimeoutError;
class HcmServerError extends Error {
    constructor(status, message) {
        super(`HCM server error ${status}: ${message}`);
        this.name = 'HcmServerError';
    }
}
exports.HcmServerError = HcmServerError;
class HcmNotFoundError extends Error {
    constructor(resource) {
        super(`HCM resource not found: ${resource}`);
        this.name = 'HcmNotFoundError';
    }
}
exports.HcmNotFoundError = HcmNotFoundError;
//# sourceMappingURL=index.js.map