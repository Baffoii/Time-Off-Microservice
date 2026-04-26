import { Repository, DataSource } from 'typeorm';
import { TimeOffBalance } from '../database/entities/time-off-balance.entity';
import { HcmClientService } from '../hcm-client/hcm-client.service';
export interface HcmBatchBalance {
    employeeId: string;
    locationId: string;
    balanceDays: number;
}
export interface BatchSyncSummary {
    updated: number;
    inserted: number;
    skipped: number;
    quarantined: number;
    stillMissing: number;
}
export declare class SyncService {
    private readonly balanceRepo;
    private readonly hcmClient;
    private readonly dataSource;
    private readonly logger;
    constructor(balanceRepo: Repository<TimeOffBalance>, hcmClient: HcmClientService, dataSource: DataSource);
    batchSync(payload: HcmBatchBalance[]): Promise<BatchSyncSummary>;
    reconcile(employeeId: string, locationId: string): Promise<TimeOffBalance>;
}
