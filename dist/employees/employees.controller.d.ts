import { EmployeesService } from './employees.service';
export declare class EmployeesController {
    private readonly employeesService;
    constructor(employeesService: EmployeesService);
    findAll(): Promise<import("../database/entities").Employee[]>;
    findOne(id: string): Promise<import("../database/entities").Employee>;
}
