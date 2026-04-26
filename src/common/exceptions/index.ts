import { HttpException, HttpStatus } from '@nestjs/common';

export class EmployeeNotFoundException extends HttpException {
  constructor(employeeId: string) {
    super(`Employee with id ${employeeId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class LocationNotFoundException extends HttpException {
  constructor(locationId: string) {
    super(`Location with id ${locationId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class InactiveEmployeeException extends HttpException {
  constructor(employeeId: string) {
    super(
      `Employee with id ${employeeId} is inactive`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class InactiveEmployeeLocationException extends HttpException {
  constructor(employeeId: string, locationId: string) {
    super(
      `Employee-Location pairing for employee ${employeeId} and location ${locationId} is inactive`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class InsufficientBalanceException extends HttpException {
  constructor(available: number, requested: number) {
    super(
      `Insufficient balance: available ${available} days, requested ${requested} days`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class HcmTimeoutError extends Error {
  constructor(operation: string) {
    super(`HCM request timed out during: ${operation}`);
    this.name = 'HcmTimeoutError';
  }
}

export class HcmServerError extends Error {
  constructor(status: number, message: string) {
    super(`HCM server error ${status}: ${message}`);
    this.name = 'HcmServerError';
  }
}

export class HcmNotFoundError extends Error {
  constructor(resource: string) {
    super(`HCM resource not found: ${resource}`);
    this.name = 'HcmNotFoundError';
  }
}
