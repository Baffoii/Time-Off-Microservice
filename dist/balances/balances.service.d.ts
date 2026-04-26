import { Repository } from 'typeorm';
import { TimeOffBalance, BalanceSource } from '../database/entities/time-off-balance.entity';
import { HcmClientService } from '../hcm-client/hcm-client.service';
export declare class BalancesService {
    private readonly balanceRepo;
    private readonly hcmClient;
    private readonly logger;
    constructor(balanceRepo: Repository<TimeOffBalance>, hcmClient: HcmClientService);
    getByEmployee(employeeId: string): Promise<TimeOffBalance[]>;
    getByEmployeeAndLocation(employeeId: string, locationId: string, refresh?: boolean): Promise<TimeOffBalance | null>;
    upsertBalance(employeeId: string, locationId: string, days: number, source: BalanceSource, missingFromLatestBatch?: boolean): Promise<TimeOffBalance>;
    deductBalance(employeeId: string, locationId: string, days: number): Promise<TimeOffBalance>;
}
