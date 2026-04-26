import { BalancesService } from './balances.service';
import { GetBalanceQueryDto } from './dto/get-balance.dto';
export declare class BalancesController {
    private readonly balancesService;
    constructor(balancesService: BalancesService);
    getByEmployee(employeeId: string): Promise<import("../database/entities").TimeOffBalance[]>;
    getByEmployeeAndLocation(employeeId: string, locationId: string, query: GetBalanceQueryDto): Promise<import("../database/entities").TimeOffBalance>;
}
