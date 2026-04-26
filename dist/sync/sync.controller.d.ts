import { SyncService, HcmBatchBalance } from './sync.service';
export declare class SyncController {
    private readonly syncService;
    constructor(syncService: SyncService);
    batchSync(payload: HcmBatchBalance[]): Promise<import("./sync.service").BatchSyncSummary>;
    reconcile(employeeId: string, locationId: string): Promise<import("../database/entities").TimeOffBalance>;
}
